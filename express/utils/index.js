const utils = {}


utils.compose = (...fns) => (initialVal) => fns.reduceRight((val, fn) => fn(val), initialVal)
utils.pipe = (...fns) => (initialVal) => fns.reduce((val, fn) => fn(val), initialVal)

utils.composeAsync = (...fns) => input => fns.reduceRight((chain, func) => chain.then(func), Promise.resolve(input));
utils.pipeAsync = (...fns) => input => fns.reduce((chain, func) => chain.then(func), Promise.resolve(input));

module.exports = utils
