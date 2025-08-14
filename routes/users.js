import bcrypt from "bcryptjs";
import express from "express";
import { readJSON, writeJSON } from "../utils/fileDb.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

const file = "./data/users.json";

router.get("/all", requireAuth, requireRole("admin"), async (req, res) => {
  const users = await readJSON(file);
  res.json(users);
});

router.get("/:id", requireAuth, async (req, res) => {
  const users = await readJSON(file);
  const user = users.find((u) => u.id == req.params.id);
  if (!user) return res.sendStatus(404);
  res.json(user);
});

// ===== Додати користувача (адмін) =====
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { email, name, role, password } = req.body;

    if (!email || !name || !role || !password) {
      return res.status(400).json({ error: "Всі поля обовʼязкові" });
    }

    const users = await readJSON(file);

    if (users.find((u) => u.email === email)) {
      return res
        .status(400)
        .json({ error: "Користувач з таким email вже існує" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = {
      id: users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1,
      email,
      name,
      role,
      password: hashedPassword,
    };

    users.push(newUser);
    await writeJSON(file, users);

    res
      .status(201)
      .json({
        message: "Користувача додано",
        user: { ...newUser, password: undefined },
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка сервера" });
  }
});

// ===== Видалити користувача (адмін) =====
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const users = await readJSON(file);
    const index = users.findIndex((u) => u.id == req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: "Користувача не знайдено" });
    }

    users.splice(index, 1);
    await writeJSON(file, users);

    res.json({ message: "Користувача видалено" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка сервера" });
  }
});
// router.delete("/:id", requireAuth, async (req, res) => {
//   try {
//     const users = await readJSON(file);
//     const index = users.findIndex((u) => u.id == req.params.id);

//     if (index === -1) {
//       return res.status(404).json({ error: "Користувача не знайдено" });
//     }

//     users.splice(index, 1);
//     await writeJSON(file, users);

//     res.json({ message: "Користувача видалено" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Помилка сервера" });
//   }
// });

// Пагінований роут
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const users = await readJSON(file);
  const pageNum = parseInt(req.query.page) || 1;
  const limitNum = parseInt(req.query.limit) || 10;
  const totalItems = users.length;
  const totalPages = Math.ceil(totalItems / limitNum);
  const startIdx = (pageNum - 1) * limitNum;
  const endIdx = startIdx + limitNum;
  const items = users.slice(startIdx, endIdx);
  res.json({
    items,
    page: pageNum,
    limit: limitNum,
    totalItems,
    totalPages,
  });
});

export default router;
