require("dotenv").config();
const dns = require("dns");
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const { url } = require("inspector");
const AutoIncrement = require("mongoose-sequence")(mongoose);

// Basic Configuration
const port = process.env.PORT || 3000;
mongoose
	.connect(process.env.DB_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.catch((error) => console.log(error));

const urlSchema = new mongoose.Schema({
	short: Number,
	original_url: String,
});
urlSchema.plugin(AutoIncrement, { inc_field: "short" });

const Url = mongoose.model("Url", urlSchema, process.env.DB_COLLECTION);

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.use(express.urlencoded({ extended: false }));

app.get("/", function (req, res) {
	res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/shorturl/:short?", function (req, res) {
	const short = req.params.short;

	if (!short) return res.sendStatus(404);

	Url.findOne({ short: short }, (err, data) => {
		if (err) return console.log(err);

		if (!data) return res.sendStatus(404);

		res.redirect(data.original_url);
	});
});

app.post("/api/shorturl/new", (req, res) => {
	try {
		const u = new URL(req.body.url);

		dns.lookup(u.host, (err, address) => {
			if (err) return console.log(err);

			if (address == undefined)
				return res.json({ error: "invalid hostname" });

			Url.findOne({ original_url: u.origin }, (err, data) => {
				if (err) return console.log(err);

				if (data) {
					return res.json({
						original_url: data.original_url,
						short_url: data.short,
					});
				}

				const url = new Url({ original_url: u.origin });

				url.save((err, data) => {
					if (err) return console.log(err);

					return res.json({
						original_url: u.origin,
						short_url: data.short,
					});
				});
			});
		});
	} catch (error) {
		if (error instanceof TypeError) {
			res.json({ error: "invalid url" });
		}
	}
});

app.listen(port, function () {
	console.log(`Listening on port ${port}`);
});
