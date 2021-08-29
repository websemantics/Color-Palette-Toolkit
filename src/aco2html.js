/* aco2html.js - .aco photoshop palette file to HTML converter
 * http://websemantics.ca
 *
 * aco2html.c - .aco photoshop palette file to HTML converter
 *
 * Copyright(C) 2006 Salvatore Sanfilippo <antirez at gmail dot com>
 * All Rights Reserved.
 *
 * This software is released under the GPL license version 2
 * Read the LICENSE file in this software distribution for
 * more information.
 */

var Aco = (function() {

        var pointer = 0;

        /* Read from a file */
        var fread = function(fp)
        {
            if(pointer > fp.length)
                return 0;

            return [
                fp.charCodeAt(pointer++),
                fp.charCodeAt(pointer++)
            ];
        }

        /* Read a 16bit word in big endian from 'fp' and return it
         * converted in the host byte order as usigned var.
         * On end of file -1 is returned. */
        var readword = function(fp)
        {
            var buf;
            var w;

            buf = fread(fp);
            if (buf == 0)
                return -1;

            w = buf[1] | buf[0] << 8;
            return w;
        }

        /* Version of readword() that exists with an error message
         * if an EOF occurs */
        var mustreadword = function(fp) {
            var w;

            w = readword(fp);
            if (w == -1) {
                console.log(stderr, "Unexpected end of file!\n");
                return -1;
            }
            return w;
        }

        // http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
        function componentToHex(c) {
            c = Math.floor(c);
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }

        function rgbToHex(r,g,b) {
            return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
        }

        /* Convert the color read from 'fp' according to the .aco file version.
         * On success zero is returned and the pass-by-reference parameters
         * populated, otherwise non-zero is returned.
         *
         * The color name is stored in the 'name' buffer that can't
         * hold more than 'buflen' bytes including the nul-term. */
        var convertcolor = function(fp, ver, buflen)
        {
            var cspace = mustreadword(fp);
            var namelen;

            if (cspace != 0) {
                var j;
                for (j = 0; j < 4; j++) mustreadword(fp);
                if (ver == 2) {
                    mustreadword(fp);
                    namelen = mustreadword(fp);
                    for (j = 0; j < namelen; j++)
                        mustreadword(fp);
                }
                console.log("Non RGB color (colorspace "+cspace+") skipped\n");
                return null;
            }

            /* data in common between version 1 and 2 record */
            var rgb = {
                r:mustreadword(fp)/256,
                g:mustreadword(fp)/256,
                b:mustreadword(fp)/256,
                name: null
            }

            // Add hex code
            rgb.hex = rgbToHex(rgb.r, rgb.g, rgb.b);

            mustreadword(fp); /* just skip this word, (Z not used for RGB) */
            if (ver == 1) return rgb;

            rgb.name = [];

            /* version 2 specific data (name) */

            mustreadword(fp); /* just skip this word, don't know what it's used for */
            /* Color name, only for version 1 */
            namelen = mustreadword(fp);
            namelen--;
            while(namelen > 0) {
                var c = mustreadword(fp);
                
                if (c > 0xff) /* To handle utf-16 here is an overkill ... */
                    c = ' ';
                if (buflen > 1) {
                    rgb.name[rgb.name.length] = c;
                    buflen--;
                }
                namelen--;
            }
            rgb.name='\0';
            mustreadword(fp); /* Skip the nul term */
            return rgb;
        }


        /* Read an ACO file from 'infp' FILE and return
         * the structure describing the palette.
         *
         * On initial end of file NULL is returned.
         * That's not a real library to read this format but just
         * an hack in order to write this convertion utility, so
         * on error we just exit(1) brutally after priting an error. */
        var readaco = function(infp)
        {
            pointer = 0;

            var ver;
            var colors;
            var j;
            var aco;

            /* Read file version */
            ver = readword(infp);

            if (ver == -1) return NULL;
            console.log("reading ACO straem version:");
            if (ver == 1) {
                console.log(" 1 (photoshop < 7.0)\n");
            } else if (ver == 2) {
                console.log(" 2 (photoshop >= 7.0)\n");
            } else {
                console.log("Unknown ACO file version %d. Exiting...\n", ver);
                return false;
            }

            /* Read number of colors in this file */
            colors = readword(infp);
            console.log("%d colors in this file\n", colors);

            /* Allocate memory */
            aco = {
                len: colors,
                ver: ver,
                color: []

            };

            /* Convert every color inside */
            for(var j=0; j < colors; j++) {

                var rgb = convertcolor(infp, ver, 256);

                if (rgb == null) continue;

                aco.color.push(rgb);

            }
            return aco;
        }

        /* Read an ACO file from 'infp' FILE and return
         * the hex colors palette. */

        var colors = function(infp)
        {

            colors = [];

            var  aco_struct = readaco(infp);

            for (var i = 0; i < aco_struct.color.length; i++)
              colors.push(aco_struct.color[i].hex);

          return colors;
        }

        return {
            readaco: readaco,
            rgbToHex:rgbToHex,
            colors: colors
        };

    })();
