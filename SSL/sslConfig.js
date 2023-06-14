const fs = require('fs');

// Configuração do SSL
const privateKey = fs.readFileSync('/etc/asterisk/keys/opasuite.key', 'utf8');
const certificate = fs.readFileSync('/etc/asterisk/keys/opasuite.crt', 'utf8');
const ca = fs.readFileSync('/etc/asterisk/keys/opasuite_ca.crt', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca
};

module.exports = {
  credentials
};
