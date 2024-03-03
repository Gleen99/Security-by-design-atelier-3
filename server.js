const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const rateLimit = require("express-rate-limit");

const app = express();

// Configuration de cookie-parser
app.use(cookieParser());

// Middleware pour traiter les données JSON dans le corps des requêtes POST
app.use(express.json());

// Configuration de express-session
app.use(session({
  secret: 'votre_secret',
  resave: false,
  saveUninitialized: true
}));

// Initialisation de csurf après l'initialisation de cookie-parser et session
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/atelier3-security', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connexion à MongoDB réussie');
  })
  .catch(err => {
    console.error('Erreur de connexion à MongoDB:', err);
  });

// Définition du modèle pour la table de contacts
const Contact = mongoose.model('Contact', {
  name: String,
  email: String,
  message: {
    type: String,
    validate: {
      validator: function(v) {
        if (/<script.*?>.*?<\/script>/i.test(v)) {
          throw new Error('Le champ "message" ne peut pas contenir de balises de script.');
        }
        return true;
      }
    }
  }
});

// Définir le dossier des fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Limiter les requêtes par IP pour éviter les attaques DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite de 100 requêtes par IP
  message: "Trop de requêtes provenant de cette IP, veuillez réessayer plus tard."
});
app.use(limiter);

// Route pour récupérer le jeton CSRF
app.get('/csrf-token', csrfProtection, (req, res) => {
  let csrfToken = req.session.csrfToken; // Vérifiez s'il y a déjà un jeton CSRF dans la session
  if (!csrfToken) {
    csrfToken = req.csrfToken(); // Si aucun jeton CSRF n'est présent, en générer un nouveau
    req.session.csrfToken = csrfToken; // Stockez le jeton CSRF dans la session pour réutilisation
  }
  console.log('CSRF Token côté serveur:', csrfToken);
  res.json({ csrfToken });
});

// Route pour afficher le formulaire de contact
app.get('/', csrfProtection, (req, res) => {
  console.log('Requête pour afficher le formulaire de contact');
  const filePath = path.join(__dirname, './src/index.html');
  
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Erreur lors de la lecture du fichier HTML :', err);
      return res.status(500).send('Une erreur est survenue lors de la lecture du fichier HTML.');
    }
    
    res.send(data);
  });
});

// Route pour soumettre le formulaire de contact
app.post('/submit', csrfProtection, async (req, res) => {
  try {
    console.log('Requête pour soumettre le formulaire de contact');
    const { name, email, message } = req.body; // Les champs _csrf ne sont pas nécessaires à soumettre
    const csrfToken = req.session.csrfToken; // Récupérer le jeton CSRF de la session
    const requestCsrfToken = req.headers['csrf-token']; // Récupérer le jeton CSRF envoyé dans les en-têtes de la requête

    // Vérifier la correspondance des jetons CSRF
    if (!csrfToken || csrfToken !== requestCsrfToken) {
      console.log('Erreur de validation CSRF.');
      return res.status(403).json({ success: false, message: 'Erreur de validation CSRF.' });
    }

    const newContact = new Contact({
      name,
      email,
      message
    });

    await newContact.save();

    const latestContact = await Contact.findOne().sort({ _id: -1 });

    console.log('Message envoyé avec succès!');
    res.status(200).json({ success: true, message: 'Votre message a été envoyé avec succès!', latestContact });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du contact:', error);
    res.status(500).json({ success: false, message: 'Une erreur est survenue. Veuillez réessayer plus tard.' });
  }
});

// Écoute du serveur sur le port 3000
const server = app.listen(3000, () => {
  console.log('Serveur en écoute sur le port 3000...');
});

module.exports = server;
