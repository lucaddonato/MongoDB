// server.js

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const connectDB = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

let db;

// função principal que conecta ao banco e inicia o servidor
(async () => {
    try {
        db = await connectDB();
        if (!db) throw new Error("falha ao conectar no mongodb");

        console.log("banco de dados conectado com sucesso");

        // middleware: bloqueia requisições se db não estiver pronto
        app.use((req, res, next) => {
            if (!db) return res.status(503).json({ error: "banco de dados ainda nao conectado" });
            next();
        });

        // rota: lista todos os candidatos
        app.get("/candidatos", async (req, res) => {
            const candidatos = await db.collection("candidatos").find({}, { projection: { nome: 1, partido: 1, total_votos: 1 } }).toArray();
            res.json(candidatos);
        });

        // rota: candidato mais jovem e mais velho de um partido
        app.get("/idade/:partido", async (req, res) => {
            const partido = req.params.partido;
            const candidatos = await db.collection("candidatos").find({ partido }).toArray();
            if (!candidatos || candidatos.length === 0) return res.status(404).json({ error: "partido nao encontrado" });

            const maisNovo = candidatos.reduce((a, b) => (a.idade < b.idade ? a : b));
            const maisVelho = candidatos.reduce((a, b) => (a.idade > b.idade ? a : b));

            res.json({ partido, maisNovo, maisVelho });
        });

        // rota: candidato com mais votos
        app.get("/maior/voto", async (req, res) => {
            const candidato = await db.collection("candidatos").find().sort({ total_votos: -1 }).limit(1).toArray();
            res.json(candidato[0] || {});
        });

        // rota: total de votos por partido
        app.get("/total", async (req, res) => {
            const total = await db.collection("candidatos").aggregate([
                { $group: { _id: "$partido", total_votos: { $sum: "$total_votos" } } },
                { $project: { _id: 0, partido: "$_id", total_votos: 1 } }
            ]).toArray();
            res.json(total);
        });

        // rota: registrar voto para um candidato
        app.post("/votar", async (req, res) => {
            try {
                const { nome } = req.body;
                const col = db.collection("candidatos");

                const candidato = await col.findOne({ nome });
                if (candidato) {
                    await col.updateOne({ nome }, { $inc: { total_votos: 1 } });
                } else {
                    await col.insertOne({
                        id: Date.now(),
                        nome,
                        partido: "",
                        idade: 0,
                        total_votos: 1
                    });
                }

                res.json({ ok: true });
            } catch (err) {
                console.error("erro ao votar:", err);
                res.status(500).json({ error: "erro ao registrar voto" });
            }
        });

        // rota: listar votos de um candidato
        app.get("/votos/:nome", async (req, res) => {
            try {
                const nome = req.params.nome;
                const candidato = await db.collection("candidatos").findOne({ nome });
                if (!candidato) return res.status(404).json({ error: "candidato nao encontrado" });

                res.json({ nome: candidato.nome, total_votos: candidato.total_votos || 0 });
            } catch (err) {
                console.error("erro ao buscar votos:", err);
                res.status(500).json({ error: "erro ao buscar votos" });
            }
        });

        const PORT = 3000;
        app.listen(PORT, () => console.log(`servidor rodando em http://localhost:${PORT}`));

    } catch (err) {
        console.error("erro ao inicializar o servidor:", err);
    }
})();