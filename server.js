const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

// 🔥 CHANGE THIS TO YOUR REAL FRONTEND DOMAIN IF NEEDED
const DOMAIN = "https://dpb-backend-dfc6.onrender.com"

// ✅ Prevent reused sessions
const usedSessions = new Set()

// ✅ Health check
app.get('/', (req, res) => {
  res.status(200).send('Backend working ✅')
})

// ✅ CREATE STRIPE SESSION (FIXED)
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Photo Booth Access'
            },
            unit_amount: 500 // $5
          },
          quantity: 1
        }
      ],
      success_url: `${DOMAIN}/camera.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}`
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

// ✅ PORT
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on ${PORT}`))