# Extendable Yeoman

[![Build Status](https://travis-ci.org/wp-cli/wp-cli.png?branch=master)](https://travis-ci.org/lkwdwrd/extendable-yeoman)

A layer between Yeoman and your generator that makes your generators easily extendable with secondary modules. All you have to do is provide events within your generator for the extensions to work from.

In addition to allowing extensions, using Extendable Yeoman allows extensions to register slash sub-generators. These are dynamic sub-generators that run from within the extension and are not part of the main generator. Extendable Yeoman takes advantage of a compatibility layer within Yeoman to run these dynamic sub-generators.

## Including Extendable Yeoman

To use Extendable Yeoman, require the Extendable Yeoman base instead of the standard Yeoman Generator base. The Extendable Yeoman base is itself an extension of the Yeoman Generator base, meaning you get all of Yeoman, but in between Yeoman and your generator is the extension layer that will allow other npm packages to hook in and modify its behavior.

Instead of:

```js
var Base = require('yeoman-generator').Base;

var Generator = Base.extend({
	// Your Generator Functionality
});
```

Use:

```js
var Base = require('extendable-yeoman').Base;

var Generator = Base.extend({
	// Your Generator Functionality
});
```

Beyond this your authoring experience is exactly the same as when writing a standard Yeoman generator. While writing, you can fire events that extensions can listen to and use to modify specific parts of the application flow.

```js
// Inside a geneator function
this.emit('event-name', somedata);
```

## Creating Extensions

An exension is a node module that has is prefixed with `ext-` and postfixed with a unique name. So to extend a generator named `generator-foo`, an extension might be named something like `ext-foo-bar`.

Extension files are included very similar to the way Yeoman Generator files are included. To extend the main generator, the extension file will be at `app/index.js` within the extension node module. To extend a subgenerator the extension file will be at `subname/index.js`. If you wish to further organize your extension, you can put your generators in a folder called `extensions/`. To even further organize your extension you can put your generators in `lib/extensions/`. This should again feel very similar to Yeoman, where you can organize your generators in the root, at `generators/`, or `lib/generators/`.

### Standard Extension Files

An extension file should export a function that takes in the generator object:

```js
module.exports = function(generator){
	generator.addListener('event-name', callback);
	// You can also directliy modify generator, but this is not advisable.
}
```

If the callback registered to an event is passed an object, by default in JS that object will be passed by reference and can be mutated. Generator authors can also choose instead to implement their own middleware systems to allow a more functional approach to data flow and manipulation.

### Slash Generators

Slash generators are nearly identical to standard extensions, with one major difference. While a standard extension lives in a namespace that already exists in the main generator, slash generators live in namespaces that do *not* exist. When they are invoked, rather than being passed the main generator object, they are invoked as *their own* generator. This means you can add subgenerators to yeoman generators that do not exist in the main generator's module.

In addition to living in a previously non-existant namespace, instead of a simple function, slash generator extension files should return a full yeoman generator definintion. They can extend the Extendable Yeoman base, the standard Yeoman Generator, or even a custom base from the main Generator if it's exposed.

```js
// A slash generator extension file
var Base = require('extendable-yeoman').Base;

module.exports = Base.extend({
	// Generator methods here.
});
```

#### Invoking a Slash Genrator

Invoking a slash generator works much the same as a normal sub-generator except it is invoked with a forward slash.

Given an extension module `ext-foo-bar`. The slash generator extension is located at `lib/extensions/baz/index.js` within the module. The `foo:baz` subgenerator does not exist in the main foo generator. However it can be invoked by adding a forward slash in before the dynamic subgenerator namespece.

```
$ yo foo:/baz
```

The slash is always a forward slash, and there can only be one. Normally Yeoman would strip this argument as a compatibility layer, but Extendable Yeoman hooks into it and uses it to run the dynamic sub-generator as a full-fledged sub-generator.

Unfortunately, subgenerators do not show up when you trigger Yeoman with the help flag.

## License

MIT
