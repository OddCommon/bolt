# Codename: ⚡️🤖 Bolt
A light weight way to make your html faster ⚡️

Demo: https://hungry-hoover-153767.netlify.app/examples/

## 🧐 What it does and WHY yet another router?
The primary goal of Bolt is to be an un-opinionated helper that speeds up page load times and gives users the feel of an SPA while remaining static HTML. It's not quite a router and not quite a transition library, it's main objective is speed and progressive enhancement, it's up to you to decide how to implement. 

You can use Bolt in a few different ways, out of the box it will improve load times with a few modifications to your code.

Heavily inspired by [Quicklink](https://github.com/GoogleChromeLabs/quicklink), [Turbo](https://turbo.hotwired.dev/) & [Highway](https://highway.js.org/) the goal of Bolt is to be an easy to integrate script that gives speed + flexibility to build around.

## 📦 Setup
TBD Steps to install

## Dev
- `npm run dev`
- http://localhost:8000/examples

### 🔨 Router Wrapper
In order for Bolt to know where updates need to be rendered you need to specify a dom element to use. This is done by adding `data-router` to any top level DOM element that will be changing from page to page. Typically this would be your main content.

Anything outside of `data-router` will be left intact between page renders.

## ✨ Super charge Bolt
Bolt has a predefined lifecycle and emits events throughout this lifecycle. you can tap into any of them at any time.

#### 🎟 Events
- bolt:before-prefetch
- bolt:prefetch-complete
- bolt:before-navigate
- bolt:navigate-complete
- bolt:loading
- bolt:before-render
- bolt:render-complete
- bolt:load-event
    - params: `{total: integer, complete: integer}`
- bolt:load-complete

## API
Bolt has a very simple API that allows you the ability to control lifecycle steps.

- `BoltRouter.pause()` - Pauses execution before the next step in lifecycle
- `BoltRouter.resume()` - Resumes execution
- `BoltRouter.kill()` - TBD Maybe?

## Examples
- Basic Examples
