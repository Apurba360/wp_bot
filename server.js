import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import express from 'express'
import QRCode from 'qrcode-terminal'

const app = express()
app.use(express.json())

let sock

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update

    if (qr) {
      QRCode.generate(qr, { small: true })
      console.log("Scan the QR with WhatsApp")
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) startSock()
    }

    if (connection === 'open') {
      console.log("WhatsApp connected")
    }
  })

  sock.ev.on('creds.update', saveCreds)
}

startSock()

app.get('/ping', (req, res) => {
  res.send('Bot alive')
})

app.post('/send', async (req, res) => {
  try {
    const { number, message } = req.body
    const jid = number + "@s.whatsapp.net"

    await sock.sendMessage(jid, { text: message })

    res.send("Message sent")
  } catch (err) {
    console.error(err)
    res.status(500).send("Error sending message")
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("Server running on port " + PORT)
})
