// Permet d'importer le package bcrypt
const bcrypt = require('bcrypt');

// Permet de créer des tokens et de les vérifier
const jwt = require('jsonwebtoken');

// Permet d'importer le package crypto-js
const cryptoJs = require('crypto-js');

// Permet d'importer le package password-validator
const passwordValidator = require('password-validator');


// Permet d'importer le modèle de données pour un utilisateur
const User = require('../models/User');


// Permet de créer un schéma de validation de mot de passe
const schemaPassword = new passwordValidator();

schemaPassword
.is().min(8)                                    
.is().max(20)                                 
.has().uppercase()                              
.has().lowercase()                              
.has().digits(2)
.has().symbols(1)                                 
.has().not().spaces();


// Permet de créer un nouvel utilisateur
exports.signup = (req, res, next) => {
    // Si le mot de passe comporte les caractères nécessaires, il sera hashé et l'adresse mail cryptée pour être enregistrés dans la base de données
    if(schemaPassword.validate(req.body.password)) {
        bcrypt.hash(req.body.password, 10)
            .then(hash => {
                const user = new User({
                    email: cryptoJs.HmacSHA512(req.body.email, 'RANDOM_KEY_SECRET').toString(),
                    password: hash
                });
                user.save()
                    .then(() => res.status(201).json({message: 'Utilisateur créé'}))
                    .catch(error => res.status(400).json({ error }));
            })
            .catch(error => res.status(500).json({ error }));
    } else {
        throw 'Le mot de passe doit contenir entre 8 et 20 caractères dont au moins une lettre majuscule, une lettre minusucle, deux chiffres et un symbole';
    }
};


// Permet à un utilisateur de se connecter
exports.login = (req, res, next) => {
    // Recherche le user dans la base de donnée qui correspond à l'adresse mail de la requête
    User.findOne({ email: cryptoJs.HmacSHA512(req.body.email, 'RANDOM_KEY_SECRET').toString() })
        .then(user => {
            if(!user) {
                return res.status(401).json({ error: 'Utilisateur non trouvé' });
            }
            // Si le user est trouvé, le mot de passe entré par l'utilisateur est comparé avec celui enregistré dans la base de données
            bcrypt.compare(req.body.password, user.password)
                .then(valid => {
                    if(!valid) {
                        return res.status(401).json({ error: 'Mot de passe incorrect' });
                    }
                    res.status(200).json({
                        userId: user._id,
                        token: jwt.sign(
                            {userId: user._id},
                            'RANDOM_TOKEN_SECRET',
                            {expiresIn: '24h'}
                        )
                    });
                })
                .catch(error => res.status(500).json({ error }));
        })
        .catch(error => res.status(500).json({ error }));
};