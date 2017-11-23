/**
 * NodeRED Utilities
 * Copyright (C) 2017 Michael Jacobsen / Marius Schmeding.
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

module.exports = function (RED) {
    'use strict'
    
    function UtilCarportNode(config) {
        RED.nodes.createNode(this, config);

        // node properties
        this.name    = config.name;

        var node     = this;

        //node.status({fill: 'yellow', shape: 'ring', text: node.configNode.pinCode})

        // respond to inputs
        this.on('input', function (msg) {
            if (!msg.hasOwnProperty('topic')) {
                node.warn('Invalid message (topic missing)');
                return
            } else if (!msg.hasOwnProperty('payload')) {
                node.warn('Invalid message (payload missing)');
                return
            } else {
                //
                // deal with the msg.topic
                //
            }
        })

        this.on('close', function () {
        })
    }
    
    RED.nodes.registerType('util-carport', UtilCarportNode)
}
