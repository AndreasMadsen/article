#article

> Analyze a stream of HTML and outputs the article title, text, and image
>
> Usually you have some feed, there will give you the title and perhaps a
> short description of the article. However its rare that it contains the image
> and certainly never the full context. This module will scrape the raw article
> html of the page and find as minimum the `title`, `text` and the `image`.

## Install

```shell
npm install article
```

## Example

```javascript
var source = 'http://en.wikipedia.org/wiki/Fish';

// The image url will be resolved from the `source` url
request(source).pipe(article(source, function (err, result) {
  if (err) throw err;

  // result = {
  //  title: String,
  //  text: String,
  //  image: String or null
  // };
}));
```

## Demo

For a demo you can run the analyse server I use for reliability scoring:

```shell
git clone https://github.com/AndreasMadsen/article.git
cd article
npm install
node tools/analyse/
open http://localhost:9100
```

## Reliability

This is the current result (Mon Jul 29 2013).

Note this data is the same data I've used to build the
heuristic algorithm. So there is a risk that the algorithm
is overfitted.

|       | Unknown | Wrong | Bad | Good | Perfect |
|------:|:-------:|:-----:|:---:|:----:|:-------:|
| Title | 0       | 0     | 0   | 0    | 258     |
| Text  | 0       | 0     | 0   | 138  | 120     |
| Image | 0       | 29    | 0   | 62   | 167     |

#### Title

The title can either be _wrong_ or _perfect_. Perfetct means that it is
the actual article title without any newspaper name or similar redundant
information.

#### Text

The text can be _wrong_, _bad_, _good_ and _perfect_. Wrong means that none
of the text is related to the article. Bad means that there are enogth
noise to give seriouse troubble in a text analysis. Good is almost perfect
expect for minor noise such as author information or social network button text.

#### Image

Image can be _wrong_, _good_ and _perfect_. Wrong is an image there is unrealted
to the article or if no image could be found. Good is either not the main article
or a lower resolution image than the expected perfect image.

##License

**The software is license under "MIT"**

> Copyright (c) 2013 Andreas Madsen
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
> THE SOFTWARE.
