const { renderReactComponent } = require('./utils');
const htmlmin = require('html-minifier');

module.exports = eleventyConfig => {
  eleventyConfig.on('beforeBuild', function () {
    // reset the counter for each new build
    // otherwise, it'll count up higher and higher on every live reload
    idCounter = 0;
  });

  let idCounter = 0;
  // copy all our /components to the output directory
  // so Vite can find them. Very important step!
  eleventyConfig.addPassthroughCopy({ './src/scripts': 'scripts' });
  eleventyConfig.addPassthroughCopy({ './src/styles': 'styles' });
  eleventyConfig.addPassthroughCopy({ './src/public': 'public' });

  eleventyConfig.addNunjucksAsyncShortcode('react', async (componentPath, options = {}) => {
    idCounter += 1;

    const hydrate = options.hydrate === false ? false : true;
    const mount = options.mount || null;
    const data = options.data || {};

    console.log(options.hydrate, hydrate, mount, data);
    return await renderReactComponent(idCounter, componentPath, hydrate, mount, data);
  });

  eleventyConfig.addShortcode('js', function (componentPath) {
    return `<script type="module" src=${JSON.stringify(componentPath)}></script>`;
  });

  eleventyConfig.addShortcode('scss', function (componentPath) {
    return `<link rel="stylesheet" href=${JSON.stringify(componentPath)} />`;
  });

  eleventyConfig.addTransform('htmlmin', function (content, outputPath) {
    // Eleventy 1.0+: use this.inputPath and this.outputPath instead
    if (outputPath && outputPath.endsWith('.html')) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
      return minified;
    }

    return content;
  });

  return {
    dir: {
      input: 'src/pages',
      layouts: '_includes/layouts',
      output: '_dev',
    },
  };
};
