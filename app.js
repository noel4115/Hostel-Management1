const express = require("express");
const mysql = require("mysql2");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "noel",
    database: "hostel"
});

db.connect((err) => {
    if (err) {
        console.log("Database connection error:", err.message);
        return;
    }
    console.log("Connected to hostel database");
});

function getStatus(capacity, occupied) {
    if (occupied === 0) return "vacant";
    if (occupied === capacity) return "Full";
    return "Available";
}

function validate(data) {
    const room_no = String(data.room_no || "").trim();
    const block_name = String(data.block_name || "").trim();
    const capacity = Number(data.capacity);
    const occupied = Number(data.no_of_occupied);

    if (!room_no || !block_name) {
        return "Room number and block name are required";
    }

    if (!["A", "B", "C", "D"].includes(block_name)) {
        return "Block must be A, B, C or D";
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
        return "Capacity must be a positive whole number";
    }

    if (!Number.isInteger(occupied) || occupied < 0 || occupied > capacity) {
        return "Occupied count must be between 0 and capacity";
    }

    return null;
}

// 1. Display all rooms
app.get("/api/rooms", (req, res) => {
    db.query("SELECT * FROM `hostel database` ORDER BY room_id", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. Search one room
app.get("/api/rooms/:id", (req, res) => {
    db.query(
        "SELECT * FROM `hostel database` WHERE room_id = ?",
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (rows.length === 0) {
                return res.status(404).json({ error: "Room not found" });
            }
            res.json(rows[0]);
        }
    );
});

// 3. Insert room
app.post("/api/rooms", (req, res) => {
    const error = validate(req.body);
    if (error) return res.status(400).json({ error });

    const { room_no, block_name, capacity, no_of_occupied } = req.body;
    const cap = Number(capacity);
    const occupied = Number(no_of_occupied);
    const status = getStatus(cap, occupied);

    const sql = `INSERT INTO \`hostel database\`
        (room_no, block_name, capacity, no_of_occupied, status)
        VALUES (?, ?, ?, ?, ?)`;

    db.query(
        sql,
        [String(room_no).trim(), block_name, cap, occupied, status],
        (err, result) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        error: "Room number already exists"
                    });
                }
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                message: "Room added successfully",
                room_id: result.insertId
            });
        }
    );
});

// 4. Update room
app.put("/api/rooms/:id", (req, res) => {
    const error = validate(req.body);
    if (error) return res.status(400).json({ error });

    const { room_no, block_name, capacity, no_of_occupied } = req.body;
    const cap = Number(capacity);
    const occupied = Number(no_of_occupied);
    const status = getStatus(cap, occupied);

    const sql = `UPDATE \`hostel database\` SET
        room_no = ?, block_name = ?, capacity = ?,
        no_of_occupied = ?, status = ?
        WHERE room_id = ?`;

    db.query(
        sql,
        [String(room_no).trim(), block_name, cap, occupied, status, req.params.id],
        (err, result) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        error: "Room number already exists"
                    });
                }
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Room not found" });
            }

            res.json({ message: "Room updated successfully" });
        }
    );
});

// 5. Delete room
app.delete("/api/rooms/:id", (req, res) => {
    db.query(
        "DELETE FROM `hostel database` WHERE room_id = ?",
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Room not found" });
            }

            res.json({ message: "Room deleted successfully" });
        }
    );
});

const PORT = process.env.PORT || 3002;
app.listen(3001, () => {
    console.log(`Server running at http://localhost:${3001}`);
});
