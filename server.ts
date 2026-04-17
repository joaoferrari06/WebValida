import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import cors from "cors";
import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.sqlite");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    timestamp TEXT,
    client TEXT,
    servidor TEXT,
    status TEXT,
    rows TEXT,
    notes TEXT
  );
  
  CREATE TABLE IF NOT EXISTS config (
    id TEXT PRIMARY KEY,
    baseFields TEXT,
    repeatingFields TEXT,
    licenseCount INTEGER
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT,
    baseFields TEXT,
    repeatingFields TEXT
  );
`);

// Migration: Rename 'cliente' to 'client' if it exists
try {
  const tableInfo = db.prepare("PRAGMA table_info(history)").all();
  const hasCliente = tableInfo.some((col: any) => col.name === 'cliente');
  const hasClient = tableInfo.some((col: any) => col.name === 'client');
  
  if (hasCliente && !hasClient) {
    db.exec("ALTER TABLE history RENAME COLUMN cliente TO client;");
    console.log("Database migration: Renamed 'cliente' to 'client' in history table.");
  }
} catch (error) {
  console.error("Migration error:", error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/history", (req, res) => {
    const rows = db.prepare("SELECT * FROM history ORDER BY timestamp DESC").all();
    const history = rows.map((row: any) => ({
      ...row,
      client: row.client || row.cliente || 'Não informado', // Fallback for any legacy data
      rows: JSON.parse(row.rows)
    }));
    res.json(history);
  });

  app.post("/api/history", (req, res) => {
    const { id, timestamp, client, servidor, status, rows, notes } = req.body;
    db.prepare("INSERT INTO history (id, timestamp, client, servidor, status, rows, notes) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, timestamp, client, servidor, status, JSON.stringify(rows), notes);
    res.json({ success: true });
  });

  app.delete("/api/history", (req, res) => {
    db.prepare("DELETE FROM history").run();
    res.json({ success: true });
  });

  app.get("/api/config", (req, res) => {
    const config = db.prepare("SELECT * FROM config WHERE id = 'main'").get();
    if (config) {
      res.json({
        ...config,
        baseFields: JSON.parse((config as any).baseFields),
        repeatingFields: JSON.parse((config as any).repeatingFields)
      });
    } else {
      res.json(null);
    }
  });

  app.post("/api/config", (req, res) => {
    const { baseFields, repeatingFields, licenseCount } = req.body;
    db.prepare("INSERT OR REPLACE INTO config (id, baseFields, repeatingFields, licenseCount) VALUES ('main', ?, ?, ?)")
      .run(JSON.stringify(baseFields), JSON.stringify(repeatingFields), licenseCount);
    res.json({ success: true });
  });

  app.get("/api/templates", (req, res) => {
    const rows = db.prepare("SELECT * FROM templates ORDER BY name ASC").all();
    const templates = rows.map((row: any) => ({
      ...row,
      baseFields: JSON.parse(row.baseFields),
      repeatingFields: JSON.parse(row.repeatingFields)
    }));
    res.json(templates);
  });

  app.post("/api/templates", (req, res) => {
    const { id, name, baseFields, repeatingFields } = req.body;
    db.prepare("INSERT OR REPLACE INTO templates (id, name, baseFields, repeatingFields) VALUES (?, ?, ?, ?)")
      .run(id, name, JSON.stringify(baseFields), JSON.stringify(repeatingFields));
    res.json({ success: true });
  });

  app.delete("/api/templates/:id", (req, res) => {
    db.prepare("DELETE FROM templates WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Automation Endpoint (Simulator for the robot)
  app.post("/api/automation/start", (req, res) => {
    // Pega a quantidade que o React enviou (se não enviar nada, o padrão é 1)
    const quantidade = req.body.quantidade || 1; 
    
    console.log(`Iniciando automação para ${quantidade} pedidos...`);
    
    // O SEGREDO ESTÁ AQUI: Adicionamos -v MAX_PEDIDOS_TESTE:${quantidade}
    const command = `robot -v MAX_PEDIDOS_TESTE:${quantidade} -d automation/logs automation/valida_pedidos.robot`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao rodar o robô: ${error.message}`);
        // Se der erro, avisa o frontend
        return res.status(500).json({ 
          success: false, 
          message: "Erro na execução do robô. Verifique o terminal.",
        });
      }
      
      console.log("Automação finalizada com sucesso!");
      // Quando terminar, avisa o frontend para tirar o "Loader2" da tela
      res.json({ 
        success: true, 
        message: `Automação de ${quantidade} pedido(s) concluída com sucesso!`,
        timestamp: new Date().toISOString()
      });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
