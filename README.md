#article

> Analyze a stream of HTML and outsputs the article text and image

## Install

```shell
npm install article
```

## Mad science

Usually you have some feed, there will give you the title and perhaps a
short description of the article. However its rare that it contains the image
and certainly never the full context. This module will scrape the raw article
html of the page and find as minimum the `title`, `text` and the `image`.

This is what has been implemented

* A good fase 1 heuristic for finding the title

## Follow and help at the wiki and issues

Wiki and blog: https://github.com/AndreasMadsen/article/wiki

## Example

```javascript
var source = 'http://en.wikipedia.org/wiki/Fish';

request(source)
  // The image url will be resolved from this source url
  .pipe(article(source, function (err, result) {
    // the greate result
  }));
```

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
