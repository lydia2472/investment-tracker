const e = require('electron');
console.log('typeof:', typeof e);
console.log('ELECTRON_RUN_AS_NODE:', process.env.ELECTRON_RUN_AS_NODE);
console.log('process.type:', process.type);
console.log('versions.electron:', process.versions.electron);
