const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');
const cheerio = require('cheerio');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Middleware for parsing URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

const initialHtml = `
  <html>
  <head>
    <title>Social Preview</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta charset="utf-8">
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <form id="urlForm" action="/" method="post">
      <label for="url">Enter URL:</label>
      <input type="text" id="url" name="url" required>
      <button type="submit">Get social preview</button>
    </form>
  </body>
  </html>
`;

app.get('/', (req, res) => {
    res.send(initialHtml);
});

app.post('/', async (req, res) => {
    const url = req.body.url;

    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        const ogMetadata = {};
        $('meta[property^="og:"]').each(function() {
            const property = $(this).attr('property').replace('og:', '');
            const content = $(this).attr('content');
            ogMetadata[property] = content;
        });

        const canonicalLink = $('link[rel="canonical"]').attr('href') || 'none';
        
        const socialPreviewHtml = `
            <div class="social-preview-wrapper">
                <h2>${url}</h2>
                <div class="fb-social-preview">
                    <img src="${ogMetadata.image || ''}" alt="Social Preview Image">
                    <div class="fb-social-preview-content">
                        <h2>${ogMetadata.title || ''}</h2>
                        <p>${ogMetadata.description || ''}</p>
                    </div>
                </div>
                <h2>canonical link: ${canonicalLink}</h2>
            </div>
        `;

        const updatedHtml = initialHtml.replace('</body>', `${socialPreviewHtml}</body>`);
        res.send(updatedHtml);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send(initialHtml.replace('</body>', `<p>Error retrieving metadata.</p></body>`));
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);

    exec(`open http://localhost:${PORT}`);
});
