/**
 * NodeRED Utilities
 * Copyright (C) 2017 Michael Jacobsen.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
**/

var Sequencer = function () {
    this._count     = 0;
    this._sequence  = new Array();
    this._timer     = null;
};

exports.Sequencer = Sequencer;

// private instance members
Sequencer.prototype._count      = 0;
Sequencer.prototype._current    = 0;
Sequencer.prototype._sequence   = null;
Sequencer.prototype._timer      = null;
Sequencer.prototype._fn         = null;

// public instance members
Sequencer.prototype.add = function(offset, topic, payload) {
    var s = {
        offset:     offset,
        topic:      topic,
        payload:    payload
    }

    var idx = this._sequence.push(s);

    this._count++;

    return idx - 1;
};

/*
{
    "data": [
        {
            "offset": 0,
            "topic": "badevaerelse",
            "payload": true,
            "lightlevel": 150
        },
        {
            "offset": 10,
            "topic": "badevaerelse",
            "payload": false,
            "lightlevel": 255
        },
        {
            "offset": 5,
            "topic": "koekken",
            "payload": true,
            "lightlevel": 150
        },
        {
            "offset": 10,
            "topic": "alrum",
            "payload": true,
            "lightlevel": 150
        },
        {
            "offset": 2,
            "topic": "stue",
            "payload": true,
            "lightlevel": 150
        },
        {
            "offset": 2,
            "topic": "juletrae",
            "payload": true,
            "lightlevel": 150
        }
    ]
}
*/

/*
1: Bryggers
2: Simon
3: Lucas
4: Thomas
5: Køkken
6: Alrum
7: Stue
8: Juletræ
9: Badeværelse
*/

Sequencer.prototype.load = function(data) {
    try {
        var arr = new Array();

        if (!data.hasOwnProperty('data')) {
            console.log("missing data");
            return false;
        }

        data.data.forEach(function (item, index) {
            console.log(item);

            if (!item.hasOwnProperty('offset')) {
                console.log("missing offset");
                return false;
            }
            if (!item.hasOwnProperty('topic')) {
                console.log("missing topic");
                return false;
            }
            if (!item.hasOwnProperty('payload')) {
                console.log("missing payload");
                return false;
            }
            if (!item.hasOwnProperty('lightlevel')) {
                console.log("missing lightlevel");
                return false;
            }

            var s = {
                offset:     item.offset,
                topic:      item.topic,
                payload:    item.payload,
                lightlevel: item.lightlevel
            }
        
            arr.push(s);
        });

        this._count    = arr.length;
        this._sequence = arr;

        return true;
    } catch (e) {
        console.log("e = ", e);
        return false;
    }
};

Sequencer.prototype.start = function(fn) {
    if (this._timer != null) {
        return false;
    }

    this._current = 0;
    this._fn      = fn;
    this._timer   = setTimeout(this._timerfunc, this._sequence[0].offset * 1000, this);

    return true;
};

Sequencer.prototype.stop = function() {
    if (this._timer == null) {
        return false;
    }

    clearTimeout(this._timer);

    return true;
};

Sequencer.prototype._timerfunc = function(node) {
    //console.log("timerfunc; ", node._current);
    node._fn(node._sequence[node._current].topic, node._sequence[node._current].payload, node._sequence[node._current].lightlevel);

    node._current++;

    if (node._current < node._count) {
        //console.log("timerfunc - next");
        node._timer = setTimeout(node._timerfunc, node._sequence[node._current].offset * 1000, node);
    } else {
        node._timer = null;     // we're done with the sequence
        //console.log("timerfunc - done");
    }
}