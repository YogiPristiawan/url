require("dotenv").config();
const dns = require("dns");
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const { url } = require("inspector");
const { urlencoded } = require("express");
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
urlSchema.plugin(AutoIncrement, { inc_field: "short", start_seq: 1 });

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
	let url = req.body.url;

	const regExp = new RegExp(
		/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}| https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi
	);

	if (!url.match(regExp)) {
		return res.json({ error: "Invalid URL" });
	}

	url = url.split("?")[0];

	Url.findOne({ original_url: url }, (err, data) => {
		if (err) return console.log(err);

		if (!data) {
			const u = new Url({ original_url: url });
			u.save((err, data) => {
				if (err) return console.log(err);
				return res.json({
					original_url: data.original_url,
					short: data.short,
				});
			});
		} else {
			return res.json({
				original_url: data.original_url,
				short: data.short,
			});
		}
	});
});

app.listen(port, function () {
	console.log(`Listening on port ${port}`);
});
