const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const cors = require('cors')

const app = express()

// ✅ CORS (LOCK DOWN LATER)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}))

app.use(express.json())

// ✅ Prevent reused sessions
const usedSessions = new Set()

// ✅ Health check (Render uses this)
app.get('/', (req, res) => {
  res.status(200).send('Backend working ✅')
})

// ✅ CREATE STRIPE SESSION
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1
        }
      ],
      success_url: `${process.env.DOMAIN}/camera.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN}`
    })

    res.json({ url: session.url })

  } catch (err) {
    console.error('STRIPE ERROR:', err)
    res.status(500).json({ error: 'Stripe failed' })
  }
})

// ✅ VERIFY PAYMENT
app.get('/verify-session', async (req, res) => {
  const { session_id } = req.query

  if (!session_id) return res.json({ valid: false })

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id)

    if (session.payment_status !== 'paid') {
      return res.json({ valid: false })
    }

    if (usedSessions.has(session_id)) {
      return res.json({ valid: false })
    }

    usedSessions.add(session_id)

    res.json({ valid: true })

  } catch (err) {
    console.log('VERIFY ERROR:', err)
    res.json({ valid: false })
  }
})

// ✅ PORT FOR RENDER
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on ${PORT}`))