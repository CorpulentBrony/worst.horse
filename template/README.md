# template
These HTML files are currently being leveraged as [nginx](https://nginx.org) [server side includes](http://nginx.org/en/docs/http/ngx_http_ssi_module.html) and loaded when [`index.html`](index.html) is processed by the server.  This allows for a level of modularization of the HTML itself.

I am considering the feasibility of making some of these actual [HTML imports](https://w3c.github.io/webcomponents/spec/imports/) (probably [`loading.html`](loading.html) and maybe to some extend [`picture.html`](picture.html)). [Update: This probably won't happen.]

The [`bin/build`](../bin/build) process will create minified files here with the `*.min.jsonld` suffix which will actually be included by [`header.html`](header.html).