#pragma once

#include <ostream>
#include <string>
#include <vector>

namespace aether::host {

/**
 * @brief Command line of the `aether_host` tool, without argv[0].
 *
 *     aether_host --plugin <module> --out <file.wav> [input] [options]
 *
 * Input (one of):
 *   --in <file.wav>          render a WAV file
 *   --sine <hz>              render a sine (default: 440 Hz)
 * Sine options:
 *   --amplitude <a>          default 0.5
 *   --duration <seconds>     default 1
 *   --sample-rate <hz>       default 48000
 *   --channels <n>           default 2
 * Other options:
 *   --block-size <n>         default 512
 *   --param <id>=<value>     set a parameter (plain value); repeatable
 *   --list-params            print parameters and exit (no --out needed)
 *
 * @return 0 on success, 1 on a usage error, 2 if loading or rendering failed.
 */
int runHost(const std::vector<std::string>& args, std::ostream& out, std::ostream& err);

} // namespace aether::host
