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
    "use strict";

	/******************************************************************************************************************
	 * 
	 *
	 */
    function UtilTransformNode(config) {
        RED.nodes.createNode(this, config)

        if (typeof config.intopic === 'undefined') {
            this.intopic = ""
        } else {
            this.intopic  = config.intopic
        }

        if (typeof config.outtopic === 'undefined') {
            this.outtopic = ""
        } else {
            this.outtopic  = config.outtopic
        }

        if (config.invalue == "false") {
            this.invalue = false
        } else {
            this.invalue = true
        }

        if (config.outvalue == "false") {
            this.outvalue = false
        } else {
            this.outvalue = true
        }

        if (typeof config.delay === 'undefined') {
            this.delay = -1
        } else {
            this.delay  = parseInt(config.delay)
        }

        this.delayer = null
        var node     = this

        this.on("input", function(msg) {
            //console.log("MQTTMsgBusTransformNode(in): msg =", msg)

            var intopicMatch = false

            if (node.intopic != "") {
                if (node.intopic == msg.topic) {
                    intopicMatch = true
                }
            } else {
                intopicMatch = true
            }

            if (intopicMatch) {
                if (node.delayer == null) {
                    if (msg.payload == node.invalue) {
                        var m = {}
                        m.payload = node.outvalue

                        if (node.outtopic != "") {
                            m.topic = node.outtopic
                        } else {
                            m.topic = msg.topic
                        }

                        if (node.delay == -1) {
                            //console.log("MQTTMsgBusTransformNode(out now): m =", m)
                            node.send(msg)
                        } else {
                            //console.log("MQTTMsgBusTransformNode(): start delay")

                            node.delayer = setTimeout(function() {
                                //console.log("MQTTMsgBusTransformNode(out delay): m =", m)

                                node.send(m)
                                node.delayer = null
                            }, node.delay * 1000)
                        }
                    }
                } else {
                    //
                    // delay already in action
                    //
                    if (msg.payload != node.invalue) {
                        //console.log("MQTTMsgBusTransformNode(): cancel delay")
                        //
                        // oposite of what fired the delay
                        //
                        clearTimeout(node.delayer)
                        node.delayer = null
                    }
                }
            }
        })            
    }

    RED.nodes.registerType("util-transform", UtilTransformNode)
}