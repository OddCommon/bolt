const { build: viteBuild } = require('vite');
const requireFromString = require('require-from-string');
const { renderToString, renderToStaticMarkup } = require('react-dom/server');
const React = require('react');

const renderReactComponent = async (id, componentPath, hydrate, mount, data = {}) => {
  const componentRootId = mount ? mount : `component-root-${id}`;

  const { output } = await viteBuild({
    root: './src',
    build: {
      ssr: true,
      write: false,
      rollupOptions: {
        input: `${componentPath}`,
      },
    },
  });

  const { default: Component } = requireFromString(output[0].code);
  const html = hydrate
    ? renderToString(React.createElement(Component, data))
    : renderToStaticMarkup(React.createElement(Component, data));

  const reactComponent = `
    <div id="${componentRootId}">${html}</div>
    ${
      hydrate
        ? `<script type="module">
    import Component from ${JSON.stringify(componentPath)};
    import React from 'react';
    import ReactDOM from 'react-dom';
    const componentRoot = document.getElementById('${componentRootId}');
    ReactDOM.hydrate(React.createElement(Component, ${JSON.stringify(data)}), componentRoot);
    </script>`
        : ''
    }
  `;
  return reactComponent;
};

module.exports = {
  renderReactComponent,
};
