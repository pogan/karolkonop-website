
var express = require('express'),
	app = express(),
	http = require('http'),
	httpServer = http.Server(app),
	config = require('./config');

app.use(express.static(__dirname));

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

app.post('/send-email', function (req, res) {
	// Endpoint for handling email sending
	// You can implement your email sending logic here using a library like nodemailer
	// For example:

	const nodemailer = require('nodemailer');
	const transporter = nodemailer.createTransport(config.nodemailer);

	const mailOptions = {
		from: config.nodemailer.auth.user, // Adres e-mail nadawcy (z formularza)
		replyTo: req.body.email, // Adres e-mail do odpowiedzi (z formularza)
		to: 'karol.konop@gmail.com', // Adres e-mail odbiorcy (twoja skrzynka)
		subject: 'Wiadomość z formularza kontaktowego karol.konop.pl od ' + req.body.name, // Temat wiadomości (z formularza)
		text: req.body.message, // Treść wiadomości (z formularza)'
	};

	transporter.sendMail(mailOptions, function (error, info) {
		if (error) {
			console.error("Błąd:", error);
			res.status(500).send("Wystąpił błąd podczas wysyłania wiadomości.");
		} else {
			console.log("Wiadomość została wysłana: " + info.response);
			res.send("Wiadomość została wysłana!");
		}
	});

	transporter.end

});

app.listen(3003, () => {
	console.log('karolkonop-website-app listening at 3003 from ', __dirname);
});
