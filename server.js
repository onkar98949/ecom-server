const express = require('express')
const app = express();
const port = process.env.PORT || 8000;
require("dotenv").config();
const mongoose = require('mongoose')
const registered = require('./UserSchema')
const account = require('./AccountSchema')
const allComment = require('./CommentSchema');
const nodemailer = require("nodemailer");
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' })
const fs = require('fs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require("crypto");

app.use(cors({ credentials: true, origin: process.env.BASE_URL }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'))

const OTP_STORAGE = {};

const authorizeUser = (req, res, next) => {
    const token = req.headers.authorization.split(' ')[1];
    try {
        const decoded = jwt.verify(token, 'seceret123');
        console.log(decoded, token);
        next();
    } catch (error) {
        console.error("Token verification failed:", error.message);
        return res.status(400).json({
            type: "error",
            msg: "Token is invalid or expired"
        });
    }
}

app.post("/send-otp", (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const otp = crypto.randomInt(100000, 999999).toString();
    OTP_STORAGE[email] = { otp, expiresAt: Date.now() + 300000 }; // 5 minutes

    // Configure nodemailer
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "your-email@gmail.com",
            pass: "your-email-password",
        },
    });

    const mailOptions = {
        from: "your-email@gmail.com",
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    };

    transporter.sendMail(mailOptions, (error) => {
        if (error) return res.status(500).json({ message: "Failed to send email" });
        res.status(200).json({ message: "OTP sent successfully" });
    });
});

app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await registered.findOne({ email });

        if (existingUser) {
            return res.status(400).json('User Already exists')
        }
        const newUser = registered({
            name, email, password
        })
        await newUser.save();
        jwt.sign({ email, id: newUser._id }, 'seceret123', {}, (err, token) => {
            if (err) throw err;
            res.status(200).cookie('token', token).json({
                id: newUser._id,
                email
            })
        })
        // res.json(newUser)

    } catch (err) {
        res.status(500).json('Server error')
    }
})

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const userData = await registered.findOne({ email, password })

        if (userData) {
            jwt.sign({ email, name: userData.name }, 'seceret123', {}, (err, token) => {
                if (err) throw err;
                res.status(200).json({
                    name: userData.name,
                    token,
                    email,
                })
            })
        } else {
            return res.status(400).json("error is found")
        }
    } catch (error) {
        res.status(400).json({ error: 'Wrong Credentials' })
    }
})



app.post('/token-verify', (req, res) => {
    const { token } = req.body;
    try {
        const decoded = jwt.verify(token, 'seceret123');
        console.log(decoded);

        return res.status(200).json({ type: "success", msg: "verified" });
    } catch (error) {
        console.error("Token verification failed:", error.message);
        return res.status(400).json({
            type: "error",
            msg: "Token is invalid or expired"
        });
    }
})


app.post('/comment', authorizeUser, async (req, res) => {
    try {
        const { comment, name, email, itemId } = req.body;

        const newComment = allComment({
            name, email, comment, itemId
        });
        await newComment.save();

        return res.status(200).json({ type: "success" })
    } catch (err) {
        res.status(400).json({ error: err })
    }
})

app.post('/delete-comment', async (req, res) => {
    try {
        const { _id } = req.body;

        const findComment = await allComment.findOneAndDelete({ _id });

        return res.status(200).json({ type: "success" })
    } catch (err) {
        res.status(400).json({ error: err })
    }
})

app.post('/get-comments', async (req, res) => {
    try {
        const { itemId } = req.body;
        const comments = await allComment.find({ itemId });

        return res.status(200).json({ type: "success", comments })
    } catch (err) {
        res.status(400).json({ error: err })
    }
})

app.post('/account', async (req, res) => {
    const { email } = req.body;

    const user = await account.findOne({ email });
    if (user) {
        return res.status(200).json(user)
    }
    return res.status(403).json('Account not found')
})

app.post('/personal-details', async (req, res) => {
    try {
        const { name, phone, city, pincode, address, email } = req.body;
        const user_account = account({
            email, name, phone, city, address, pincode,
        })
        await user_account.save();
        res.status(200).json({ msg: 'Account Created Successfully' });
    } catch (err) {
        return res.status(403).json({ error: err.message || "An unexpected error occurred." });
    }
})

app.post('/contact', (req, res) => {

    const { name, email, subject, text } = req.body;

    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'ceasar.mueller2@ethereal.email',
            pass: 'TgDVKnrU9uhF8SkfhE'
        }
    });
    async function main() {
        const info = await transporter.sendMail({
            from: `${name} ${email}`,
            to: "admin@example.com",
            subject: `${subject}`,
            text: `${text}`,
        });
        console.log("Message sent: %s", info.messageId);
    }
    res.status(200).json({ msg: "Form Submitted" })
    main().catch(console.error);
})

app.patch('/comment', async (req, res) => {
    try {
        const { id, comment } = req.body;
        const updateComment = await allComment.findOneAndUpdate({ _id: id }, { $set: { comment } }, { new: true });

        if (updateComment) return res.status(200).json({ type: "success" })
        return res.status(400).json({ error: "try again" })
    } catch (err) {
        res.status(400).json({ error: err })
    }
})


app.put('/edit-profile', async (req, res) => {
    try {
        const { phone, city, pincode, address, name, email } = req.body;
        const updated_account = await account.findOneAndUpdate({ email }, { email, pincode, name, phone, city, address }, { new: true });

        if (updated_account) return res.status(200).json({ type: "success" });
        return res.status(401).json({ error: "An unexpected error occurred." });
    } catch (err) {
        return res.status(401).json(err.message);
    }
})

app.post('/checkout', async (req, res) => {
    try {
        const { products } = req.body
        const lineItems = products.map(item => {
            return {
                price_data: {
                    currency: "inr",
                    product_data: {
                        name: item.title
                    },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: item.quantity
            }
        })

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: 'payment',
            line_items: lineItems,
            success_url: process.env.BASE_URL + '/success',
            cancel_url: process.env.BASE_URL + '/cancel'
        })

        res.json({ id: session.id })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})


mongoose.connect(process.env.MONGODB_URL)
    .then(() => { console.log('Db Connected'); })
    .catch((err) => {
        console.log(err);
    })

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})