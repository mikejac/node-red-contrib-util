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

module.exports = function (RED) {
    'use strict'

    //var expired = require('./expired.js');
    var sequence = require('./sequence.js');

    var topicEnable     = "enable";
    var topicStart      = "start";
    var topicStop       = "stop";
    var topicLightlevel = "currentambientlightlevel";

    function UtilHomeSimNode(config) {
        RED.nodes.createNode(this, config);

        this.seq         = null;
        this.lightlevel  = 0;
        this.enabled     = false;

        var node = this;

        // respond to inputs
        this.on('input', function (msg) {
            if (!msg.hasOwnProperty('topic')) {
                node.warn("Invalid message (topic missing)");
                return;
            } else if (!msg.hasOwnProperty('payload')) {
                node.warn("Invalid message (payload missing)");
                return;
            }

            //
            //
            //
            if (msg.topic == "sequence") {
                RED.log.debug("UtilHomeSim(): sequence");
                node.loadSequence(msg.payload);            
            } else if (msg.topic == topicStart) {
                RED.log.debug("UtilHomeSim(): start");

                if (!node.enabled) {
                    RED.log.debug("UtilHomeSim(): not enabled, do nothing");
                    return;
                }

                node.status({fill: 'green', shape: 'dot', text: "Start"});
                setTimeout(function () { node.status({}); }, 3000);
                
                if (node.seq == null) {
                    node.warn("Sequence has not been loaded");
                    return;
                }

                node.seq.start(function (topic, payload, lightlevel) {
                    RED.log.debug("UtilHomeSim(start): topic      = " + topic);
                    RED.log.debug("UtilHomeSim(start): payload    = " + payload);
                    RED.log.debug("UtilHomeSim(start): lightlevel = " + lightlevel);
                    
                    if (node.lightlevel <= lightlevel) {
                        var m = {
                            topic:      topic,
                            payload:    payload
                        };

                        node.send(m);
                    } else {
                        RED.log.debug("UtilHomeSim(start): node.lightlevel = " + node.lightlevel);
                    }
                });
            } else if (msg.topic == topicStop) {
                RED.log.debug("UtilHomeSim(): stop");

                if (!node.enabled) {
                    RED.log.debug("UtilHomeSim(): not enabled, do nothing");
                    return;
                }

                node.status({fill: 'green', shape: 'dot', text: "Stop"});
                setTimeout(function () { node.status({}); }, 3000);

                if (node.seq == null) {
                    node.warn("Sequence has not been loaded");
                    return;
                }

                node.seq.stop();
            } else if (msg.topic == topicEnable) {
                RED.log.debug("UtilHomeSim(): enable");
                node.status({fill: 'yellow', shape: 'dot', text: "Enabled: " + msg.payload.toString()});
                setTimeout(function () { node.status({}); }, 3000);

                node.enabled = msg.payload;

            } else if (msg.topic == topicLightlevel) {
                RED.log.debug("UtilHomeSim(): lightlevel");
                node.status({fill: 'yellow', shape: 'dot', text: "Lightlevel: " + msg.payload.toString()});
                setTimeout(function () { node.status({}); }, 3000);

                node.lightlevel = msg.payload;
            } else {
                node.warn("Unknown topic; " + msg.topic);
            }
        });

        this.on('close', function () {

        })

        /******************************************************************************************************************
         * 
         *
         */
        this.loadSequence = function(seq) {
            var seqData = {};

            try {
                if (seq.constructor === {}.constructor) {
                    RED.log.debug("UtilHomeSim::loadSequence(): type 1");
                    seqData = seq;
                } else if (seq.constructor === "".constructor) {
                    RED.log.debug("UtilHomeSim::loadSequence(): type 2");
                    seqData = JSON.parse(seq);
                } else {
                    node.warn("Input is not a sequence");
                    return;
                }
            } catch (e) {
                node.warn("Loaded object is not a valid sequence (1)");
                return;
            }

            node.seq = new sequence.Sequencer();
            
            if (!node.seq.load(seqData)) {
                node.warn("Loaded object is not a valid sequence (2)");
                node.seq = null;
            }
        };
    }

    RED.nodes.registerType('util-homesim', UtilHomeSimNode)
}
