/* Importa as dependências */
const express = require('express');
const cors = require('cors');
const mysql = require ('mysql2');
const jwt = require("jsonwebtoken")

/* Cria o servidor WEB */
const app = express();

const {DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, SECRET_KEY} = process.env

// middlewares
app.use(express.json());
app.use(cors());



app.post("/register", (request, response) => {
    const user = request.body.user

    const searchCommand = `
      SELECT * FROM Users
      WHERE email = ?
    `

    db.query(searchCommand, [user.email], (error, data) => {
        if (error){
                console.log(error)
                return
        }

        if(data.length !==0) {
            response.json({message: "Já existe um usuário cadastrado com esse e-mail. Tente outro e-mail", userExists: true})
            return
        }

        const insertCommand = `
            INSERT INTO Users(name, email, password)
            VALUES(?, ?, ?)
        `

        db.query(insertCommand, [user.name, user.email, user.password], (error) => {
            if(error) {
                console.log(error)
                return
            }

            response.json({message: "Usuário cadastrado com sucesso!"})
        })
    })
})

app.post("/login", (request, response) => {
   const user = request.body.user

   const searchCommand = `
        SELECT * FROM Users
        WHERE email = ?
   `

   db.query(searchCommand, [user.email], (error, data) => {
    if (error) {
        console.log(error)
        return
    }
   

   if(data.length === 0) {
    response.json({message: "Não existe nenhum usuário cadastrado com esse e-mail!"})
    return
   }

    if(user.password === data[0].password) {
        const email = user.email
        const id = data[0].id
        const name = data[0].name
        
        const token = jwt.sign({ id, email, name }, SECRET_KEY, { expiresIn: "1h"})
        response.json({ token, ok: true})
        return
    }

    response.json({ message: "Credenciais inválidas! Tente novamente"})
})
})

app.get("/getname", (request, response)  => {
    const token = request.headers.authorization

    const decoded = jwt.verify(token, SECRET_KEY)

    response.json({ name: decoded.name })
})

app.get("/verify", (request, response) => {
    const token = request.headers.authorization

    jwt.verify(token, SECRET_KEY, (error, decoded) => {
        if (error) {
            response.json({message: "Token inválido! Efetue o login novamente!"})
            return
        }

        response.json({ ok: true })
    })
})

app.post('/salvar-tempo', (req, res) => {
    const { score } = req.body; 
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ message: 'Token não fornecido' });
    }

    try {
      
        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.id;

        
        const checkQuery = 'SELECT * FROM Scores WHERE user_id = ?';
        db.query(checkQuery, [userId], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Erro ao verificar pontuação', error: err });
            }

            if (result.length > 0) {
              
                const updateQuery = 'UPDATE Scores SET score = ? WHERE user_id = ?';
                db.query(updateQuery, [score, userId], (err, updateResult) => {
                    if (err) {
                        return res.status(500).json({ message: 'Erro ao atualizar o tempo', error: err });
                    }
                    res.status(200).json({ message: 'Tempo atualizado com sucesso' });
                });
            } else {
               
                const insertQuery = 'INSERT INTO Scores (user_id, score) VALUES (?, ?)';
                db.query(insertQuery, [userId, score], (err, insertResult) => {
                    if (err) {
                        return res.status(500).json({ message: 'Erro ao salvar o tempo', error: err });
                    }
                    res.status(200).json({ message: 'Tempo salvo com sucesso' });
                });
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao verificar o token', error: err });
    }
});

app.get('/ranking', (req, res) => {
    const query = 'SELECT u.name, s.score FROM Scores s JOIN Users u ON s.user_id = u.id ORDER BY s.score ASC LIMIT 10';
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erro ao buscar ranking', error: err });
        }
        
        res.status(200).json(results); 
    });
});


app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000")
})

const db = mysql.createPool({
    connectionLimit: 10,
    host: DB_HOST,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD
})