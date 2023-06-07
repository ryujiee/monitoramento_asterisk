const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

// Configuração do Express
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuração do express-session
app.use(session({
    secret: 'eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTY4NjE2NDkwNywiaWF0IjoxNjg2MTY0OTA3fQ.GlQEwXVAzX3M3E_DBKsX--UtiL2VFOEZny430YFIpdY',
    resave: false,
    saveUninitialized: false
  }));

// Configuração do Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username });

      if (!user) {
        return done(null, false);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});


const {
    getLogs,
    getTotalTroncos,
    getTotalRamais,
    getQuantidadeLigacoes,
    checkAsteriskStatus,
    getAsteriskUptime,
    getOfflineAndOnlinePeers,
    getChamadasEmAndamento,
    getSIPPeersInUse,
    getPeerOwner,
} = require('./service');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/monitoramento', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('Conectado ao MongoDB');
  })
  .catch((error) => {
    console.error('Erro ao conectar ao MongoDB:', error);
  });

// Middleware para verificar se o usuário está autenticado
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
  };

// Rota para criar usuário e senha na primeira vez que a plataforma é acessada
app.get('/setup', async (req, res) => {
    try {
      const usersCount = await User.countDocuments();
  
      if (usersCount > 0) {
        res.redirect('/login');
        return;
      }
  
      res.render('setup');
    } catch (error) {
      console.log('Erro ao verificar usuários:', error);
      res.status(500).send('Erro ao verificar usuários');
    }
  });
  
  // Rota para processar o formulário de criação de usuário e senha
  app.post('/setup', async (req, res) => {
    try {
      const { username, password } = req.body;
      const usersCount = await User.countDocuments({});
  
      if (usersCount > 0) {
        res.redirect('/login');
        return;
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      await User.create({
        username,
        password: hashedPassword
      });
  
      res.redirect('/login');
    } catch (error) {
      console.log('Erro ao criar usuário:', error);
      res.status(500).send('Erro ao criar usuário');
    }
  });
  
  app.get('/login', async (req, res) => {
    try {
      // Verificar se existe algum usuário no banco de dados
      const count = await User.countDocuments({}).exec();
  
      if (count === 0) {
        // Não há usuários, redirecionar para a página de setup
        return res.redirect('/setup');
      }
  
      // Já existem usuários, renderizar a página de login
      res.render('login');
    } catch (err) {
      // Lidar com erros de consulta ao banco de dados
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });
  
  
  app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
  }));





    app.get('/', isAuthenticated, async (req, res) => {
        let ramaisOnline = null;
        let ramaisOffline = null;
        let totalTroncos = null;
        let mensagemChamadasEmAndamentoEntrada = null;
        let totalRamaisData = null;
        let quantidadeLigacoes = null;
        let asteriskStatus = null;
        let asteriskUptime = null;
        let ramaisData = null;
        let totalOffline = null;
        let totalOnline = null;
        let totalRamais = null;
        let mensagemChamadasEmAndamento = null;
        let peersInUse = null;
        let logs = null;
       // let lastCalls = null;

        try {
            totalRamaisData = await getTotalRamais();
            quantidadeLigacoes = await getQuantidadeLigacoes();
            asteriskStatus = await checkAsteriskStatus();
            asteriskUptime = await getAsteriskUptime();
            ramaisData = await getOfflineAndOnlinePeers();
            ramaisOffline = ramaisData.offline;
            ramaisOnline = ramaisData.online;
            totalRamais = totalRamaisData.totalRamais;
            totalOnline = ramaisOnline.length;
            totalOffline = ramaisOffline.length;
            chamadasEmAndamento = await getChamadasEmAndamento();
            mensagemChamadasEmAndamento = chamadasEmAndamento.mensagens;
            mensagemChamadasEmAndamentoEntrada = chamadasEmAndamento.mensagens_entrada;
            peersInUse = await getSIPPeersInUse();
            totalTroncos = await getTotalTroncos();
            logs = getLogs();
            //lastCalls = lastCalls()

            // Adicionar o detentor do ramal para cada peer em uso
            for (const peer of peersInUse) {
                if (peer.inUse !== '0/0/0') {
                    const owner = await getPeerOwner(peer.peerName);
                    const ownerWithoutTags = owner.replace(/<[^>]+>/g, '');
                    peer.owner = ownerWithoutTags;
                }
            }
        } catch (error) {
            console.log('Erro ao enviar o comando:', error);
        }

        res.render('dashboard', {
            ramaisOnline,
            ramaisOffline,
            totalTroncos,
            mensagemChamadasEmAndamentoEntrada,
            totalRamaisData,
            quantidadeLigacoes,
            asteriskStatus,
            asteriskUptime,
            ramaisData,
            totalOffline,
            totalOnline,
            totalRamais,
            mensagemChamadasEmAndamento,
            peersInUse,
            logs,
          //  lastCalls
        });
    });

    const updateData = async () => {
        try {
            const totalRamaisData = await getTotalRamais();
            const quantidadeLigacoes = await getQuantidadeLigacoes();
            const asteriskStatus = await checkAsteriskStatus();
            const asteriskUptime = await getAsteriskUptime();
            const ramaisData = await getOfflineAndOnlinePeers();
            const ramaisOffline = ramaisData.offline;
            const ramaisOnline = ramaisData.online;
            const totalRamais = totalRamaisData.totalRamais; // Atualizado para utilizar diretamente o valor retornado
            const totalOnline = ramaisOnline.length; // Quantidade de ramais online
            const totalOffline = ramaisOffline.length; // Quantidade de ramais offline
            const chamadasEmAndamento = await getChamadasEmAndamento();
            const mensagemChamadasEmAndamento = chamadasEmAndamento.mensagens;
            const mensagemChamadasEmAndamentoEntrada = chamadasEmAndamento.mensagens_entrada;
            const peersInUse = await getSIPPeersInUse();
            const totalTroncos = await getTotalTroncos();
            logs = getLogs();
          //  lastCalls = lastCalls()



            // Adicionar o detentor do ramal para cada peer em uso
            for (const peer of peersInUse) {
                if (peer.inUse !== '0/0/0') {
                    const owner = await getPeerOwner(peer.peerName);

                    // Remover caracteres entre "<>"
                    const ownerWithoutTags = owner.replace(/<[^>]+>/g, '');
                    peer.owner = ownerWithoutTags;
                }
            }

            // Emitir os dados atualizados para os clientes conectados
            io.emit('dataUpdated', {
                totalRamaisData,
                quantidadeLigacoes,
                asteriskStatus,
                asteriskUptime,
                ramaisData,
                ramaisOffline,
                totalOffline,
                totalOnline,
                totalRamais,
                peersInUse,
                totalTroncos,
                logs,
              //  lastCalls
            });
            // Emitir os dados atualizados dos ramais online para os clientes conectados
            io.emit('ramaisOnlineUpdated', {
                ramaisOnline: ramaisOnline
            });
            // Emitir os dados atualizados dos ramais offline para os clientes conectados
            io.emit('ramaisOfflineUpdated', {
                ramaisOffline: ramaisOffline
            });
            // Emitir os dados atualizados das ligações para os clientes conectados
            io.emit('chamadasAndamentoUpdated', {
                mensagemChamadasEmAndamento: mensagemChamadasEmAndamento
            });
            // Emitir os dados atualizados das ligações de entrada para os clientes conectados
            io.emit('chamadasAndamentoEntradaUpdated', {
                mensagemChamadasEmAndamentoEntrada: mensagemChamadasEmAndamentoEntrada
            });
            // Emitir os dados atualizados das ligações de entrada para os clientes conectados
            io.emit('totalTroncosUpdated', {
                totalTroncos: totalTroncos
            });
            // Emitir os dados atualizados dos ramais em ligação ou livre
            io.emit('peersInUse', {
              peersInUse: peersInUse
            });
            // Emitir os dados atualizados dos logs
            io.emit('logsUpdated', {
              logs: logs
            });
        } catch (error) {
            console.log('Erro ao enviar o comando:', error);
        }
    }
    let interval;

    app.post("/updateInterval", (req, res) => {
        let selectedValue = req.body.interval;
        if (selectedValue < 5) {
            selectedValue = 5;
        }
        updateInterval(selectedValue);
        console.log(selectedValue);
        res.sendStatus(200);
    });
    

    function updateInterval(selectedValue) {
        clearInterval(interval);
        const intervalMilliseconds = selectedValue * 1000;
        interval = setInterval(updateData, intervalMilliseconds);
    }

    // Atualizar os dados a cada 5 segundos inicialmente
    updateInterval(5);

// Rota de logout
app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login');
  });
app.disable('x-powered-by');
// Iniciar o servidor
const port = 7000;
server.listen(port, () => {
    console.log(`Servidor rodando em http://181.215.215.190:${port}`);
});