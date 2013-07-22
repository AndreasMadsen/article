#article

> Analyze a stream of HTML and outsputs the article text and image

## Install

```shell
npm install article
```

## Example

```javascript
var source = 'http://en.wikipedia.org/wiki/Fish';

request(source)
  // The image url will be resolved from this source url
  .pipe(article(source, function (err, result) {
    // result = {
    //  title: String,
    //  text: String,
    //  image: String
    // };
  }));
```

## Mad science

Usually you have some feed, there will give you the title and perhaps a
short description of the article. However its rare that it contains the image
and certainly never the full context. This module will scrape the raw article
html of the page and find as minimum the `title`, `text` and the `image`.

### Score

This is the current result (Mon Jul 22 2013)

|       | Unknown | Wrong | Bad | Good | Perfect |
|------:|:-------:|:-----:|:---:|:----:|:-------:|
| Title | 0       | 0     | 0   | 0    | 260     |
| Text  | 0       | 7     | 2   | 168  | 83      |
| Image | 0       | 44    | 0   | 76   | 140     |

### Definitions

##### Title
> A single sentense or similar describing the article, it should not contain
> the websites name or any other information there isn't relevant to the article

##### Text
> The raw unformated article context, it should not contain the title or comments
> there too, also related article links and author information is unwanted.

##### Image
> The main image there is related to the article, if no image exists it should
> be `null`. If there are multiply sugestions then the biggest image is the
> wanted result. However no remote requests can be made to vertify any assumptions.

#### Strategy

There will be:

* 1 `fase-0` algortime
* 3 `fase-1` algortimes
* 1 `fase-2` algortime

The `fase-0` algoritme will detect and use microdata if present and give
sugestions (there will be very few) from the microdata. The algoritme will find
the  `title`, `text`, `image`.

The `fase-1` algoritmes will give unrealted sugestions on `title`, `text` and `image`.
So each algoritme is responsible for one thing, at that only. These sugestions
will be based on human developed heuristics.

Its important to note that `fase-0` and `fase-1` will perform calculations
in parallel as the HTML gets passed. But any final calculation in `fase-1` won't
be performed if `fase-0` gives any result.

The `fase-2` algoritme runs when `fase-0` and/or `fase-1` is done. It then looks
at the `title`, `text` and `image` sugestions and their calculated likelihood and
determents a new likelihood, based on some related assumtions between `title`,
`text` and `image`. Such as that the `title` is likely to be near the `text` or
that words from the `title` is likely to appear in the `text`.

The final best result from `fase-2` is then used at the final object.

### Status

##### fase-0

* Not implemented

##### fase-1

* A _prove me wrong_ perfect heuristic for finding the title
* A good heuristic for the text
* An almost good heuristic for the image

##### fase-2

* A combine feature for text and title
* A work in progress image heuristic
* A text reduce aloritme

## Follow and help at the wiki and issues

Wiki and blog: https://github.com/AndreasMadsen/article/wiki

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
