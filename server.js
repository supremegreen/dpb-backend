const express = require("express")
const Stripe = require("stripe")
const cors = require("cors")
const crypto = require("crypto")

const app = express()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_XXXXXXXX")

app.use(cors())
app.use(express.json())

/* ================================
   🔐 TEMP TOKEN STORE (IN MEMORY)
================================ */
const validTokens = new Map()

function generateToken() {
  return crypto.randomBytes(32).toString("hex")
}

/* ================================
   CREATE CHECKOUT SESSION
================================ */

app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Nightclub Photo Booth" },
            unit_amount: 100
          },
          quantity: 1
        }
      ],
      mode: "payment",

      success_url:
        "https://dpb-backend-dfc6.onrender.com/success?session_id={CHECKOUT_SESSION_ID}",

      cancel_url: "https://dpbstudio.com/index.html"
    })

    res.json({ url: session.url })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Failed to create checkout session" })
  }
})

/* ================================
   🔥 SUCCESS HANDLER
================================ */

app.get("/success", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(
      req.query.session_id
    )

    if (session.payment_status !== "paid") {
      return res.redirect("https://dpbstudio.com/index.html")
    }

    // 🔐 Generate token
    const token = generateToken()

    // ⏳ Store expiration (5 minutes)
    const expiresAt = Date.now() + 5 * 60 * 1000
    validTokens.set(token, expiresAt)

    // 🔥 AUTO CLEANUP AFTER EXPIRATION
    setTimeout(() => {
      validTokens.delete(token)
    }, 5 * 60 * 1000)

    // 🚀 Redirect to camera with token
    res.redirect(`https://dpbstudio.com/camera.html?token=${token}`)
  } catch (err) {
    console.error(err)
    res.redirect("https://dpbstudio.com/index.html")
  }
})

/* ================================
   🔐 VERIFY TOKEN (SESSION SAFE)
================================ */

app.get("/verify-token", (req, res) => {
  const { token } = req.query

  if (!token || !validTokens.has(token)) {
    return res.json({ valid: false })
  }

  const expiresAt = validTokens.get(token)

  // ⏳ Check expiration
  if (Date.now() > expiresAt) {
    validTokens.delete(token)
    return res.json({ valid: false })
  }

  // ✅ DO NOT DELETE HERE (IMPORTANT FIX)
  res.json({ valid: true })
})

/* ================================
   START SERVER
================================ */

const PORT = process.env.PORT || 4242

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})