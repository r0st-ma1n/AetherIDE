import { describe, expect, it } from 'vitest';
import type { AetherParameter } from '@/shared/types';
import {
  canBindParameter,
  convertParameterType,
  createParameter,
  nextParameterId,
  parameterErrors,
} from './parameters';

const gain: AetherParameter = {
  id: 'gain',
  name: 'Gain',
  type: 'float',
  min: 0,
  max: 1,
  default: 0.5,
};

describe('nextParameterId', () => {
  it('skips taken ids', () => {
    expect(nextParameterId([])).toBe('param1');
    expect(nextParameterId(['gain'])).toBe('param2');
    expect(nextParameterId(['param2', 'param3'])).toBe('param4');
  });
});

describe('createParameter', () => {
  it('creates a valid float parameter with a free id', () => {
    const param = createParameter(['param1']);
    expect(param).toEqual({
      id: 'param2',
      name: 'Param 2',
      type: 'float',
      min: 0,
      max: 1,
      default: 0,
    });
    expect(parameterErrors([param], 0)).toEqual([]);
  });
});

describe('convertParameterType', () => {
  it.each(['float', 'bool', 'choice'] as const)(
    'keeps id and name and yields a valid %s parameter',
    (type) => {
      const converted = convertParameterType(gain, type);
      expect(converted).toMatchObject({ id: 'gain', name: 'Gain', type });
      expect(parameterErrors([converted], 0)).toEqual([]);
    }
  );
});

describe('parameterErrors', () => {
  it('reports only errors of the given entry, without the path prefix', () => {
    const list: AetherParameter[] = [
      { ...gain, default: 2 },
      { ...gain, id: 'mix', min: 1, max: 0 },
    ];
    expect(parameterErrors(list, 0)).toEqual([
      'default: must be within [min, max]',
    ]);
    expect(parameterErrors(list, 1)).toEqual(['max: must be greater than min']);
  });

  it('reports duplicate ids on the later entry', () => {
    const list = [gain, { ...gain, name: 'Copy' }];
    expect(parameterErrors(list, 0)).toEqual([]);
    expect(parameterErrors(list, 1)).toEqual([
      'id: duplicate parameter id "gain"',
    ]);
  });

  it('reports schema errors of the whole entry', () => {
    const broken = { id: 'x', name: 'X', type: 'float', default: 0 };
    expect(
      parameterErrors([broken as unknown as AetherParameter], 0).join(' ')
    ).toContain("must have required property 'min'");
  });
});

describe('canBindParameter', () => {
  it('binds buttons to bool and knobs/sliders to float or choice', () => {
    expect(canBindParameter('Button', 'bool')).toBe(true);
    expect(canBindParameter('Button', 'float')).toBe(false);
    expect(canBindParameter('Knob', 'float')).toBe(true);
    expect(canBindParameter('Slider', 'choice')).toBe(true);
    expect(canBindParameter('Knob', 'bool')).toBe(false);
  });
});
