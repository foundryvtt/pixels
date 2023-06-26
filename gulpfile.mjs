import gulp from "gulp";
import nodeResolve from "@rollup/plugin-node-resolve";
import {rollup} from "rollup";

/**
 * Compile javascript source files into a single output file.
 *
 * - `gulp buildJS` - Compile all javascript files into into single file & build source maps.
 */
async function compileJavascript() {
  const bundle = await rollup({
    input: "./scripts/pixels.mjs",
    plugins: [nodeResolve()]
  });
  await bundle.write({
    file: "pixels.mjs",
    format: "es",
    sourcemap: true
  });
}

// Build JS
export const compile = gulp.series(compileJavascript);
export default compile;
