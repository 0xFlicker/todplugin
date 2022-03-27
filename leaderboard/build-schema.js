const minimist = require('minimist')
const { readFile, writeFile, unlink } = require('fs')
const { promisify } = require('util')
const { safeLoad } = require('js-yaml')
const chokidar = require('chokidar')

const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)
const unlinkAsync = promisify(unlink)
const args = minimist(process.argv)

const processFile = file =>
  readFileAsync(`${file}.yaml`, 'utf8')
    .then(safeLoad)
    .then(contents => writeFileAsync(`${file}.json`, JSON.stringify(contents, null, 2), 'utf8'))

const watcher = chokidar.watch('./src/openapi/*.yaml', {
  ignored: /.*\.json$/, // ignore json output
  persistent: !!args.watch
})

watcher
  .on('add', async path => {
    const yaml = path.slice(0, -5)
    await processFile(yaml)
    console.log(`Built ${yaml}.json`)
  })
  .on('change', async path => {
    const yaml = path.slice(0, -5)
    await processFile(yaml)
    console.log(`Updated ${yaml}.json`)
  })
  .on('unlink', async path => {
    const yaml = path.slice(0, -5)
    await unlinkAsync(`${yaml}.json`)
    console.log(`Removed ${yaml}.json`)
  })
