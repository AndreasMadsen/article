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
html of the page and find as minimum the `text` and the `image`.

If everything turns out to be simple or I become a supergeniuse (both unlikely)
then the outputted format will be something like:

```javascript
result = {
  image: 'http://fish.test',
  title: 'Fish are cool',
  context: [
    {type: 'h1', 'Fish are cool'},
    {type: 'h4', 'Short introduction to why fish are awesome'},
    {type: 'p', 'Long text concluding that fish are awesome because they are!'}
  ]
};
```

and I won't be dependend on any pre knowledge. And as minimum it will be able
to find the image, the title and the context: 

```javascript
result = {
  image: 'http://en.wikipedia.org/wiki/Fish/image.png',
  title: 'Fish are cool'
  context: 
    'Short introduction to why fish are awesome\n' +
    'Long text concluding that fish are awesome because they are!'
};
```

and it may very well be dependent on some preknowlege from a feed.

The current thought is make a simple prototype there will grap the `<title>`
context and do a [Levenshtein distance](http://en.wikipedia.org/wiki/Levenshtein_distance)
on that and some HTML fragments. Until it concludes some title, not containing
the websites name (usually a part of the `<title>`) has been optained.

## Follow and help at the wiki and issues

https://github.com/AndreasMadsen/article/wiki

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
