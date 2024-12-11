const express = require("express");
const app = express();
const cors = require("cors");
const db_query = require("./database.js"); // Database connection
require("dotenv").config(); // Load environment variables

// Middleware
app.use(express.json());
app.use(cors());

// Endpoint to fetch all settled trades for a member
app.post("/trades/settle/:member_id", async (req, res) => {
    const memberId = req.params.member_id;

    try {
        const query = `
            SELECT 
                trade_id, 
                buyer_id, 
                seller_id, 
                trade_date, 
                trade_price, 
                trade_qty, 
                market_id, 
                product_name, 
                trade_margin, 
                adjusted_quantity, 
                adjusted_margin_buyer
            FROM settled_trades
            WHERE buyer_id = $1 OR seller_id = $1
        `;
        const queryParams = [memberId];

        const result = await db_query.query(query, queryParams);

        res.status(200).json({
            settled_trades: result.rows,
        });
    } catch (error) {
        console.error("Error fetching settled trades:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// Endpoint to fetch wallet details by member_id
app.get("/wallet/:member_id", async (req, res) => {
    const memberId = req.params.member_id;
    try {
        const walletQuery = `
            SELECT * FROM member_wallet WHERE user_id = $1
        `;
        const result = await db_query.query(walletQuery, [memberId]);

        if (result.rows.length === 0) {
            return res.status(201).json({ wallet: { user_id: memberId, available_balance: 0.00, current_softblock: 0.00 } });
        }

        res.status(200).json({ wallet: result.rows[0] });
    } catch (error) {
        console.error("Error fetching wallet details:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// Endpoint to update wallet balance (add or deduct money)
app.post("/wallet/update", async (req, res) => {
    const { member_id, type, amount } = req.body;

    if (!member_id || !type || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: "Invalid input data." });
    }

    try {
        await db_query.query("BEGIN");

        const walletQuery = `
            SELECT available_balance, current_softblock FROM member_wallet WHERE user_id = $1
        `;
        const walletResult = await db_query.query(walletQuery, [member_id]);

        if (walletResult.rows.length === 0) {
            await db_query.query("ROLLBACK");
            return res.status(404).json({ error: "User wallet not found." });
        }

        const currentBalance = Number(walletResult.rows[0].available_balance);
        const currentSoftblock = Number(walletResult.rows[0].current_softblock);
        let newBalance = currentBalance;
        let errorCode = 200;
        const transcode = type.toUpperCase() === "ADD" ? "CREDIT" : "DEBIT";

        if (type.toLowerCase() === "add") {
            newBalance += amount;
        } else if (type.toLowerCase() === "deduct") {
            if (currentBalance - currentSoftblock < amount) {
                const residualMargin = amount - (currentBalance - currentSoftblock);
                errorCode = 300;

                const logFailedTransactionQuery = `
                    INSERT INTO margin_block_release_transactions (
                        entity_id, transcode, margin_type, margin_amount, error_code, residual_margin, created_datetime, user_id
                    )
                    VALUES (
                        gen_random_uuid(), $1, 'ACC_BAL', $2, $3, $4, current_timestamp, $5
                    )
                `;
                await db_query.query(logFailedTransactionQuery, [transcode, amount, errorCode, residualMargin, member_id]);
                await db_query.query("COMMIT");

                return res.status(400).json({
                    error: `Cannot deduct given amount as standing balance is lower than the amount ${amount.toFixed(2)}`,
                });
            }
            newBalance -= amount;
        } else {
            await db_query.query("ROLLBACK");
            return res.status(400).json({ error: "Invalid transaction type." });
        }

        const updateWalletQuery = `
            UPDATE member_wallet
            SET available_balance = $1, last_update_time = current_timestamp
            WHERE user_id = $2
        `;
        await db_query.query(updateWalletQuery, [newBalance, member_id]);

        const logTransactionQuery = `
            INSERT INTO margin_block_release_transactions (
                entity_id, transcode, margin_type, margin_amount, error_code, residual_margin, created_datetime, user_id
            )
            VALUES (
                gen_random_uuid(), $1, 'ACC_BAL', $2, $3, 0.00, current_timestamp, $4
            )
        `;
        await db_query.query(logTransactionQuery, [transcode, amount, errorCode, member_id]);

        await db_query.query("COMMIT");

        res.status(200).json({
            message: "Transaction successful",
            new_balance: newBalance,
        });
    } catch (error) {
        await db_query.query("ROLLBACK");
        console.error("Error updating wallet balance:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// Endpoint to fetch transaction logs by member_id
app.get("/wallet/logs/:member_id", async (req, res) => {
    const memberId = req.params.member_id;
    const { filter } = req.query;

    let dateCondition = "";
    if (filter === "this-week") {
        dateCondition = "AND created_datetime >= NOW() - INTERVAL '7 days'";
    } else if (filter === "this-month") {
        dateCondition = "AND created_datetime >= DATE_TRUNC('month', NOW())";
    } else if (filter === "this-year") {
        dateCondition = "AND created_datetime >= DATE_TRUNC('year', NOW())";
    }

    try {
        const logsQuery = `
            SELECT 
                created_datetime AS date,
                transcode AS action,
                margin_amount AS amount
            FROM 
                margin_block_release_transactions
            WHERE 
                user_id = $1
                ${dateCondition}
            ORDER BY 
                created_datetime DESC
        `;
        const result = await db_query.query(logsQuery, [memberId]);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching transaction logs:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// Endpoint to fetch trade reports for a member using user_id
app.post("/report/:user_id", async (req, res) => {
    const userId = req.params.user_id; // Extract user_id from the request
    console.log("Received userId:", userId); // Debug log

    try {
        const query = `
            SELECT 
                order_id,
                trade_date_time,
                trade_qty,
                side,
                product_name,
                trade_margin
            FROM trade_master
            WHERE member_id = $1
        `;
        const queryParams = [userId]; // Use user_id value to query the member_id column
        console.log("Executing query with params:", queryParams); // Debug log

        const result = await db_query.query(query, queryParams);
        console.log("Query result:", result.rows); // Debug log

        if (result.rows.length === 0) {
            console.log("No trades found for userId:", userId); // Debug log
            return res.status(404).json({ error: "No trades found for the user." });
        }

        res.status(200).json({ trades: result.rows });
    } catch (error) {
        console.error("Error fetching trade reports:", error); // Debug log
        res.status(500).json({ error: "Internal server error." });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
