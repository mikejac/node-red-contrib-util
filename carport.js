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

    // enums
    var MODE = {
        AUTO:       0, 
        ON:         1, 
        OFF:        2,
        ANIMATION:  3
    };
    
    var BRYGGERS_SWITCH = {
        NONE:   0,
        MOTION: 1,
        LIGHTS: 2,
        SELF:   3
    };

    function UtilCarportNode(config) {
        RED.nodes.createNode(this, config);

        // node properties
        this.name                           = config.name;
        this.ambientbrightness              = config.ambientbrightness;
        this.motionbrightness               = config.motionbrightness;
        this.verandamotionbrightness        = 20;
        this.manualbrightness               = config.manualbrightness;
        this.lowlightthreshold_ambience     = config.lowlightthreshold_ambience;
        this.highlightthreshold_ambience    = config.highlightthreshold_ambience;
        this.lowlightthreshold_motion       = config.lowlightthreshold_motion;

        this.lightLevel                     = 0;
        this.myTimer                        = null;
        this.bryggersTimer                  = null;
        this.bryggersState                  = BRYGGERS_SWITCH.NONE;
        this.mode                           = MODE.AUTO;
        this.autoOnOff                      = MODE.AUTO;
        this.verandaOn                      = false;
        this.motionEnabled                  = false;
        this.enableAmbientLight             = false;

        this.verandaMotionDetected          = null;             // date object
        this.verandaLightDetected           = null;             // date object

        this.timeOnMotion                   = 120000;           // 2 min.
        this.timeOnVerandaMotion            = 60000;            // 1 min.
        this.timeOnLocation                 = 300000;           // 5 min.
        this.timeOnAutomatic                = 3600000;          // 1 hour
        this.timeOnBryggers                 = 300000;           // 5 min.

        this.ambienthue                     = 240.0;
        this.ambientsaturation              = 100.0;

        var node = this;

        RED.log.debug("UtilCarport(): ambientbrightness           = " + node.ambientbrightness.toString())
        RED.log.debug("UtilCarport(): motionbrightness            = " + node.motionbrightness.toString())
        RED.log.debug("UtilCarport(): verandamotionbrightness     = " + node.verandamotionbrightness.toString())
        RED.log.debug("UtilCarport(): manualbrightness            = " + node.manualbrightness.toString())
        RED.log.debug("UtilCarport(): lowlightthreshold_ambience  = " + node.lowlightthreshold_ambience.toString())
        RED.log.debug("UtilCarport(): highlightthreshold_ambience = " + node.highlightthreshold_ambience.toString())
        RED.log.debug("UtilCarport(): lowlightthreshold_motion    = " + node.lowlightthreshold_motion.toString())

        // respond to inputs
        this.on('input', function (msg) {
            if (!msg.hasOwnProperty('topic')) {
                node.warn('Invalid message (topic missing)');
                return;
            } else if (!msg.hasOwnProperty('payload')) {
                node.warn('Invalid message (payload missing)');
                return;
            }

            if (node.isLightLevel(msg) > 0) {
                RED.log.debug("UtilCarport(isLightLevel): lightLevel = " + node.lightLevel.toString());
                node.status({fill: 'yellow', shape: 'dot', text: "Lightlevel: " + node.lightLevel.toString()});
                setTimeout(function () { node.status({}); }, 3000);

                if (node.mode != MODE.AUTO) {
                    RED.log.debug("UtilCarport(isLightLevel): mode is not auto, do nothing");
                    return;
                }
            
                if (node.autoOnOff != MODE.AUTO) {
                    RED.log.debug("UtilCarport(isLightLevel): automatic on/off is not auto, do nothing");
                    return;
                }
            
                if (node.myTimer !== null) {     // timer is running, do nothing
                    RED.log.debug("UtilCarport(isLightLevel): timer is running, do nothing");
                    return;
                }
            
                node.doAmbientLight();
            } else if (node.isMotion(msg)) {
                RED.log.debug("UtilCarport(isMotion)");

                if (node.mode != MODE.AUTO) {
                    RED.log.debug("UtilCarport(isMotion): mode is not auto, do nothing");
                    return;
                }
            
                if (node.autoOnOff != MODE.AUTO) {
                    RED.log.debug("UtilCarport(isMotion): automatic on/off is not auto, do nothing");
                    return;
                }
                
                if (!node.isTimeOk()) {
                    RED.log.debug("UtilCarport(isMotion): not the right time, do nothing");
                    return;        
                }
            
                if (!node.getMotion(msg)) {
                    RED.log.debug("UtilCarport(isMotion): motion = false, do nothing");
                    return;
                }

                RED.log.debug("UtilCarport(isMotion): motion detected");

                node.status({fill: 'yellow', shape: 'dot', text: "Motion detected"});
                setTimeout(function () { node.status({}); }, 3000);

                if (node.lightLevel <= node.lowlightthreshold_motion) {
                    RED.log.debug("UtilCarport(isMotion): lightlevel low, starting timer; " + node.timeOnMotion.toString());
            
                    var centerMsg = node.createMessageWhite(node.motionbrightness);
                    var ringMsg   = node.createMessageWhite(node.motionbrightness);
            
                    if (node.myTimer !== null) {
                        node.stopTimer(node.myTimer);
                    }
                            
                    node.myTimer = setTimeout(function(){ 
                        RED.log.debug("UtilCarport(isMotion): timer ending");

                        node.bryggersState == BRYGGERS_SWITCH.NONE;
                        node.timerEnding();
                    }, node.timeOnMotion);
                            
                    var onMsg = {
                        topic:   "On",
                        payload: true,
                    };
                
                    node.bryggersState = BRYGGERS_SWITCH.SELF;

                    node.send([ringMsg, centerMsg, null, onMsg, null, null]);
                } else {
                    RED.log.debug("UtilCarport(isMotion): lightlevel high, do nothing");
                }
            } else if (node.isVerandaMotion(msg)) {
                RED.log.debug("UtilCarport(isVerandaMotion)");
                
                if (node.mode != MODE.AUTO) {
                    RED.log.debug("UtilCarport(isVerandaMotion): mode is not auto, do nothing");
                    return;
                }
            
                if (node.autoOnOff != MODE.AUTO) {
                    RED.log.debug("UtilCarport(isVerandaMotion): automatic on/off is not auto, do nothing");
                    return;
                }
                
                if (node.getVerandaMotion(msg)) {
                    if (node.bryggersState == BRYGGERS_SWITCH.NONE) {
                        RED.log.debug("UtilCarport(isVerandaMotion): start bryggersTimer");
                        
                        node.bryggersState = BRYGGERS_SWITCH.MOTION;

                        node.bryggersTimer = setTimeout(function(){ 
                            RED.log.debug("UtilCarport(isVerandaMotion): bryggersTimer ending");
                            
                            node.bryggersState = BRYGGERS_SWITCH.NONE;
                            node.bryggersTimer = null;
                        }, 2000);
                    } else if (node.bryggersState == BRYGGERS_SWITCH.SWITCH) {
                        if (node.bryggersTimer !== null) {
                            RED.log.debug("UtilCarport(isVerandaMotion): bryggersTimer is already running, stop timer");
                            node.stopTimer(node.bryggersTimer);
                            node.bryggersTimer = null;
                        } else {
                            RED.log.debug("UtilCarport(isVerandaMotion): bryggersTimer not running, do nothing");                            
                        }
                    }
                }

                if (node.myTimer !== null) {     // timer is running, do nothing
                    RED.log.debug("UtilCarport(isVerandaMotion): timer is running, do nothing");
                    return;
                }

                if (!node.isTimeOk()) {
                    RED.log.debug("UtilCarport(isVerandaMotion): not the right time, do nothing");
                    return;        
                }
            
                if (!node.getVerandaMotion(msg)) {
                    //RED.log.debug("UtilCarport(isVerandaMotion): veranda motion = false, do nothing");
                    return;
                }

                //node.verandaMotionDetected = new Date();
        
                RED.log.debug("UtilCarport(isVerandaMotion): veranda motion detected");

                node.status({fill: 'yellow', shape: 'dot', text: "Veranda motion detected"});
                setTimeout(function () { node.status({}); }, 3000);

                if (node.lightLevel <= node.lowlightthreshold_motion) {
                    RED.log.debug("UtilCarport(isVerandaMotion): lightlevel low, starting timer; " + node.timeOnVerandaMotion.toString());
            
                    var centerMsg = node.createMessageWhite(node.verandamotionbrightness);
                    var ringMsg   = node.createMessageWhite(node.verandamotionbrightness);
            
                    //if (node.myTimer !== null) {
                    //    node.stopTimer();
                    //}
                            
                    node.myTimer = setTimeout(function(){ 
                        RED.log.debug("UtilCarport(isVerandaMotion): timer ending");

                        node.timerEnding();
                    }, node.timeOnVerandaMotion);
                            
                    node.send([ringMsg, centerMsg, null, null, null, null]);
                } else {
                    RED.log.debug("UtilCarport(isVerandaMotion): lightlevel high, do nothing");
                }
            } else if (node.isLocation(msg) != 0) {
                RED.log.debug("UtilCarport(isLocation)");

                if (node.mode != MODE.AUTO) {
                    RED.log.debug("UtilCarport(isLocation): mode is not auto, do nothing");
                    return;
                }
            
                if (node.autoOnOff != MODE.AUTO) {
                    RED.log.debug("UtilCarport(isLocation): automatic on/off is not auto, do nothing");
                    return;
                }
                
                if (!node.getComingHome(msg)) {
                    RED.log.debug("UtilCarport(isLocation): not coming home, do nothing");
                    return;                    
                }

                RED.log.debug("UtilCarport(isLocation): location; coming home");

                node.status({fill: 'yellow', shape: 'dot', text: "Coming home"});
                setTimeout(function () { node.status({}); }, 3000);

                if (node.lightLevel <= node.lowlightthreshold_motion) {
                    RED.log.debug("UtilCarport(isMotion): lightlevel low, starting timer; " + node.timeOnLocation.toString());
            
                    var centerMsg = node.createMessageWhite(node.motionbrightness);
                    var ringMsg   = node.createMessageWhite(node.motionbrightness);
            
                    if (node.myTimer !== null) {
                        node.stopTimer(node.myTimer);
                    }
                            
                    node.myTimer = setTimeout(function(){ 
                        RED.log.debug("UtilCarport(isLocation): timer ending");
                        
                        node.bryggersState == BRYGGERS_SWITCH.NONE;
                        node.timerEnding();
                    }, node.timeOnLocation);
                            
                    var onMsg = {
                        topic:   "On",
                        payload: true,
                    };
                
                    node.bryggersState = BRYGGERS_SWITCH.SELF;
                    node.send([ringMsg, centerMsg, null, onMsg, null, null]);
                } else {
                    RED.log.debug("UtilCarport(isLocation): lightlevel high, do nothing");
                }
            } else if (node.isAutomaticOnOff(msg)) {
                if (node.getAutomaticOnOff(msg)) {
                    RED.log.debug("UtilCarport(isAutomaticOnOff): on");

                    node.status({fill: 'yellow', shape: 'dot', text: "Automatic ON"});
                    setTimeout(function () { node.status({}); }, 3000);

                    var centerMsg = node.createMessageWhite(node.manualbrightness);
                    var ringMsg   = node.createMessageWhite(node.manualbrightness);
            
                    if (node.mode == MODE.ON) {
                        RED.log.debug("UtilCarport(isAutomaticOnOff): mode is ON, do nothing");
                    }
                    
                    if (node.myTimer !== null) {
                        node.stopTimer(node.myTimer);
                    }
                            
                    node.myTimer = setTimeout(function(){ 
                        node.timerEnding();
            
                        node.autoOnOff = MODE.AUTO;
                    }, node.timeOnAutomatic);
                            
                    node.autoOnOff = MODE.ON;
                    
                    node.send([ringMsg, centerMsg, null, null, null, null]);
                } else {
                    RED.log.debug("UtilCarport(isAutomaticOnOff): auto");

                    node.status({fill: 'yellow', shape: 'dot', text: "Automatic OFF"});
                    setTimeout(function () { node.status({}); }, 3000);

                    if (node.mode == MODE.OFF) {
                        RED.log.debug("UtilCarport(isAutomaticOnOff): mode is OFF, do nothing");
                    }
                    
                    if (node.myTimer !== null) {
                        node.stopTimer(node.myTimer);
                    }
                                            
                    node.autoOnOff = MODE.AUTO;

                    node.timerEnding();
                }
            } else if (node.isMotionEnabled(msg)) {
                node.motionEnabled = node.getMotionEnabled(msg);

                if (node.motionEnabled) {
                    RED.log.debug("UtilCarport(isMotionEnabled): motionEnabled = true");                    
                } else {
                    RED.log.debug("UtilCarport(isMotionEnabled): motionEnabled = false");
                }
            } else if (node.isVerandaLightOn(msg)) {
                RED.log.debug("UtilCarport(isVerandaLightOn)");

                if (!node.verandaOn) {
                    RED.log.debug("UtilCarport(isVerandaLightOn): verandaOn == false, do nothing");
                    return;
                }

                if (node.bryggersState == BRYGGERS_SWITCH.NONE) {
                    RED.log.debug("UtilCarport(isVerandaLightOn): start bryggersTimer");
                    
                    node.bryggersState = BRYGGERS_SWITCH.LIGHTS;

                    if (node.bryggersTimer !== null) {
                        node.stopTimer(node.bryggersTimer);
                    }

                    node.bryggersTimer = setTimeout(function(){ 
                        RED.log.debug("UtilCarport(isVerandaLightOn): bryggersTimer ending");
                        
                        if (node.bryggersState == BRYGGERS_SWITCH.LIGHTS) {
                            RED.log.debug("UtilCarport(isVerandaLightOn): bryggersTimer ending; turn on lights at 100%");

                            node.status({fill: 'yellow', shape: 'dot', text: "Bryggers ON"});
                            setTimeout(function () { node.status({}); }, 3000);

                            var centerMsg = node.createMessageWhite(node.manualbrightness);
                            var ringMsg   = node.createMessageWhite(node.manualbrightness);
                    
                            if (node.mode == MODE.ON) {
                                RED.log.debug("UtilCarport(isAutomaticOnOff): mode is ON, do nothing");
                            }
                            
                            if (node.myTimer !== null) {
                                node.stopTimer(node.myTimer);
                            }
                                    
                            node.myTimer = setTimeout(function(){ 
                                node.timerEnding();
                    
                                node.autoOnOff = MODE.AUTO;
                            }, node.timeOnAutomatic);
                                    
                            node.autoOnOff = MODE.ON;
                            
                            node.send([ringMsg, centerMsg, null, null, null, null]);
                        }

                        node.bryggersState = BRYGGERS_SWITCH.NONE;
                        node.bryggersTimer = null;
                    }, 2000);
                }
            } else if (node.isAnimation(msg) /*!=*/ > 0) {
                RED.log.debug("UtilCarport(isAnimation)");

                if (node.mode != MODE.ANIMATION) {
                    if (node.mode != MODE.AUTO) {
                        RED.log.debug("UtilCarport(isAnimation): mode is not auto and not animation, do nothing");
                        return;
                    }
                }
            
                if (node.autoOnOff != MODE.AUTO) {
                    RED.log.debug("UtilCarport(isAnimation): automatic on/off is not auto, do nothing");
                    return;
                }

                if (node.myTimer !== null) {
                    node.stopTimer(node.myTimer);
                }

                if (msg.payload.animation == "off") {
                    node.mode = MODE.AUTO;
                } else {
                    node.mode = MODE.ANIMATION;
                }

                var centerAnim = node.createAnimationOff();
                var ringAnim   = node.createAnimationOff();

                if (msg.payload.where == "center") {
                    RED.log.debug("UtilCarport(isAnimation): starting animation on center; " + msg.payload.animation);
                    centerAnim = node.createAnimation(msg.payload.animation, msg.payload.color, msg.payload.speed, "FFFFFF");
                } else if (msg.payload.where == "ring") {
                    RED.log.debug("UtilCarport(isAnimation): starting animation on ring; " + msg.payload.animation);
                    ringAnim   = node.createAnimation(msg.payload.animation, msg.payload.color, msg.payload.speed, "FFFFFF");
                } else if (msg.payload.where == "both") {
                    RED.log.debug("UtilCarport(isAnimation): starting animation on both; " + msg.payload.animation);
                    centerAnim = node.createAnimation(msg.payload.animation, msg.payload.color, msg.payload.speed, "FFFFFF");
                    ringAnim   = node.createAnimation(msg.payload.animation, msg.payload.color, msg.payload.speed, "FFFFFF");
                } else {
                    RED.log.debug("UtilCarport(isAnimation): invalid where: " + msg.payload.where);
                    return;
                }

                node.send([null, null, null, null, ringAnim, centerAnim]);
            } else if (node.isEnableAmbientLight(msg)) {
                RED.log.debug("UtilCarport(isEnableAmbientLight)");

                if (node.mode != MODE.AUTO) {
                    RED.log.debug("UtilCarport(isEnableAmbientLight): mode is not auto, do nothing");
                    return;
                }
            
                if (node.autoOnOff != MODE.AUTO) {
                    RED.log.debug("UtilCarport(isEnableAmbientLight): automatic on/off is not auto, do nothing");
                    return;
                }
            
                if (node.myTimer !== null) {     // timer is running, do nothing
                    RED.log.debug("UtilCarport(isEnableAmbientLight): timer is running, do nothing");
                    return;
                }
            
                node.doAmbientLight();
            } else if (node.isAmbientColor(msg) != 0) {
                RED.log.debug("UtilCarport(isAmbientColor)");
                
                if (node.mode != MODE.AUTO) {
                    RED.log.debug("UtilCarport(isAmbientColor): mode is not auto, do nothing");
                    return;
                }
            
                if (node.autoOnOff != MODE.AUTO) {
                    RED.log.debug("UtilCarport(isAmbientColor): automatic on/off is not auto, do nothing");
                    return;
                }
            
                if (node.myTimer !== null) {     // timer is running, do nothing
                    RED.log.debug("UtilCarport(isAmbientColor): timer is running, do nothing");
                    return;
                }
            
                node.doAmbientLight();
            } else if (node.isMode(msg) > 0) {
                var centerMsg = {};
                var ringMsg   = {};
                var animOff   = node.createAnimationOff();
                
                switch (node.mode) {
                    case MODE.OFF:
                        RED.log.debug("UtilCarport(isMode): mode = off");
                    
                        node.status({fill: 'yellow', shape: 'dot', text: "Mode OFF"});
                        setTimeout(function () { node.status({}); }, 3000);

                        if (node.myTimer !== null) {
                            node.stopTimer(node.myTimer);
                            node.myTimer = null;
                        }
            
                        centerMsg = node.createMessageOff();
                        ringMsg   = node.createMessageOff();
                        break;
            
                    case MODE.ON:
                        RED.log.debug("UtilCarport(isMode): mode = on");
                    
                        node.status({fill: 'yellow', shape: 'dot', text: "Mode ON"});
                        setTimeout(function () { node.status({}); }, 3000);

                        if (node.myTimer !== null) {
                            node.stopTimer(node.myTimer);
                            node.myTimer = null;
                        }
            
                        centerMsg = node.createMessageWhite(node.manualbrightness);
                        ringMsg   = node.createMessageWhite(node.manualbrightness);
                        break;
            
                    case MODE.AUTO:
                        RED.log.debug("UtilCarport(isMode): mode = auto");
                    
                        node.status({fill: 'yellow', shape: 'dot', text: "Mode AUTO"});
                        setTimeout(function () { node.status({}); }, 3000);

                        if (node.myTimer !== null) {
                            node.stopTimer(node.myTimer);
                        }

                        node.timerEnding();
                        return;
                }
            
                node.send([ringMsg, centerMsg, null, null, animOff, animOff]);
            } else if (msg.topic == "StatusActive") {
                // ignore message
            } else if (msg.topic == "StatusFault") {
                // ignore message
            } else {
                RED.log.warn("UtilCarport(): unknown topic '" + msg.topic + "'");
                RED.log.debug("UtilCarport(): msg = " + JSON.stringify(msg.payload));
            }
        })

        this.on('close', function () {
        })

        /******************************************************************************************************************
         * 
         *
         */
        this.isDark = function(lightLevel, lowThreshold, highThreshold) {
            if (lightLevel <= lowThreshold) {
                return 1;
            }

            if (lightLevel > highThreshold) {
                return 0;
            }

            return -1;
        }
        //
        //
        this.isTimeOk = function() {
            return node.motionEnabled;
        }
        /******************************************************************************************************************
         * message handlers
         *
         */
        this.isAnimation = function(msg) {
            if (msg.topic == "animation") {
                if (typeof msg.payload !== "object") {
                    RED.log.warn("UtilCarport(isAnimation): payload is not an object");
                    return -1;
                }
                if (!msg.payload.hasOwnProperty('animation')) {
                    RED.log.warn("UtilCarport(isAnimation): payload is missing field 'animation'");
                    return -1;
                }
                if (!msg.payload.hasOwnProperty('color')) {
                    RED.log.warn("UtilCarport(isAnimation): payload is missing field 'color'");
                    return -1;
                }
                if (!msg.payload.hasOwnProperty('speed')) {
                    RED.log.warn("UtilCarport(isAnimation): payload is missing field 'speed'");
                    return -1;
                }
                if (!msg.payload.hasOwnProperty('where')) {
                    RED.log.warn("UtilCarport(isAnimation): payload is missing field 'where'");
                    return -1;
                }

                return 1;
            }
                
            return 0;
        }
        //
        //
        this.isMotion = function(msg) {
            if (msg.topic == "MotionDetected") {
                if (typeof msg.payload === "boolean") {
                    return true;
                }
            }

            return false;
        }
        //
        //
        this.getMotion = function(msg) {
            return msg.payload;
        }
        //
        //
        this.isLocation = function(msg) {
            if (msg.topic.startsWith("AreaActivity")) {
                if (typeof msg.payload !== 'object') {
                    RED.log.warn("UtilCarport(isLocation): payload is not an object");
                    return -1;
                }
                if (!msg.payload.hasOwnProperty('who')) {
                    RED.log.warn("UtilCarport(isLocation): payload is missing field 'who'");
                    return -1;
                }
                if (!msg.payload.hasOwnProperty('area')) {
                    RED.log.warn("UtilCarport(isLocation): payload is missing field 'area'");
                    return -1;
                }
                if (!msg.payload.hasOwnProperty('type')) {
                    RED.log.warn("UtilCarport(isLocation): payload is missing field 'type'");
                    return -1;
                }
                
                return 1;
            }

            return 0;
        }
        //
        //
        this.getComingHome = function(msg) {
            if (msg.payload.area == "home" && msg.payload.type == "enters") {
                return true;
            }
        
            return false;
        }
        //
        //
        this.isLightLevel = function(msg) {
            if (msg.topic == "currentambientlightlevel") {
                if (!node.verandaOn) {
                    node.lightLevel = msg.payload;
                } else {
                    RED.log.debug("UtilCarport::isLightLevel(): verandaOn = true, don't save value");
                }
                
                return 1;
            }

            return 0;
        }
        //
        //
        this.isMotionEnabled = function(msg) {
            if (msg.topic == "motion_enabled") {
                return true;
            }

            return false;
        }
        //
        //
        this.getMotionEnabled = function(msg) {
            if (msg.payload == "true") {
                return true;
            } else {
                return false;
            }
        }
        //
        //
        this.isAutomaticOnOff = function(msg) {
            if (msg.topic == "OnAutomatic") {
                if (typeof msg.payload === "boolean") {
                    return true;
                }
            }

            return false;
        }
        //
        //
        this.getAutomaticOnOff = function(msg) {
            return msg.payload;
        }
        //
        //
        this.isMode = function(msg) {
            if (msg.topic == "mode") {
                if (msg.payload == "on") {
                    node.mode = MODE.ON;

                    return 1;
                } else if (msg.payload == "off") {
                    node.mode = MODE.OFF;
                    
                    return 1;
                } else if (msg.payload == "auto") {
                    node.mode = MODE.AUTO;

                    return 1;
                }
                
                return -1;
            }
            
            return 0;
        }
        //
        //
        this.isVerandaLightOn = function(msg) {
            if (msg.topic == "veranda_light_on") {
                if (typeof msg.payload === "boolean") {
                    node.verandaOn = msg.payload;

                    return 1;
                }
                
                return -1;
            }
            
            return 0;
        }
        //
        //
        this.getVerandaLightOn = function(msg) {
            return msg.payload;
        }
        //
        //
        this.isVerandaMotion = function(msg) {
            if (msg.topic == "veranda_motion") {
                return true;
            }
            
            return false;
        }
        //
        //
        this.getVerandaMotion = function(msg) {
            return msg.payload;
        }
        //
        //
        //
        this.isEnableAmbientLight = function(msg) {
            if (msg.topic == "enable_ambient_light") {
                if (typeof msg.payload === "boolean") {
                    node.enableAmbientLight = msg.payload;
                }

                return true;
            }

            return false;
        }
        //
        //
        this.isAmbientColor = function(msg) {
            if (msg.topic == "ambient_color") {
                if (typeof msg.payload === 'object') {
                    RED.log.debug("UtilCarport::isAmbientColor(): payload is an object");
                } else if (typeof msg.payload === 'string') {
                    RED.log.debug("UtilCarport::isAmbientColor(): payload is an string");
                    
                    try {
                        msg.payload = JSON.parse(msg.payload);
                    } catch (err) {
                        RED.log.error("UtilCarport::isAmbientColor(): malformed object; " + msg.payload);
                        return -1;
                    }
                } else {
                    RED.log.warn("UtilCarport::isAmbientColor(): payload is invalid");
                    return -1;               
                }

                if (!msg.payload.hasOwnProperty('hue')) {
                    RED.log.warn("UtilCarport::isAmbientColor(): payload is missing field 'hue'");
                    return -1;
                }

                if (!msg.payload.hasOwnProperty('saturation')) {
                    RED.log.warn("UtilCarport::isAmbientColor(): payload is missing field 'saturation'");
                    return -1;
                }

                if (!msg.payload.hasOwnProperty('brightness')) {
                    RED.log.warn("UtilCarport::isAmbientColor(): payload is missing field 'brightness'");
                    return -1;
                }

                node.ambienthue         = msg.payload.hue;
                node.ambientsaturation  = msg.payload.saturation;
                node.ambientbrightness  = msg.payload.brightness;

                RED.log.debug("UtilCarport::isAmbientColor(): ambienthue        = " + node.ambienthue.toString());
                RED.log.debug("UtilCarport::isAmbientColor(): ambientsaturation = " + node.ambientsaturation.toString());
                RED.log.debug("UtilCarport::isAmbientColor(): ambientbrightness = " + node.ambientbrightness.toString());
                
                return 1;
            }

            return 0;
        }
        /******************************************************************************************************************
         * 
         *
         */
        this.stopTimer = function(myTimer) {
            clearTimeout(myTimer);
        }
        //
        //
        this.timerEnding = function() {
            var centerMsg = {};
            var ringMsg   = {};
            
            var darkness = node.isDark(node.lightLevel, node.lowlightthreshold_ambience, node.highlightthreshold_ambience);
                
            switch (darkness) {
                case 1:
                    centerMsg = node.createAmbientColor(); //node.createMessageBlue(node.ambientbrightness);
                    ringMsg   = node.createMessageOff();
                    break;
                
                case 0:
                    centerMsg = node.createMessageOff();
                    ringMsg   = node.createMessageOff();
                    break;
                
                case -1:
                    centerMsg = node.createAmbientColor(); //node.createMessageBlue(node.ambientbrightness);
                    ringMsg   = node.createMessageOff();
                    break;
            }

            var onMsg1 = {
                topic:   "on",
                payload: false,
            };

            var onMsg2 = {
                topic:   "On",
                payload: false,
            };
                
            node.send([ringMsg, centerMsg, onMsg1, onMsg2, null, null]);
                
            node.myTimer = null;
        }
        //
        //
        this.doAmbientLight = function() {
            var centerMsg = {};
            var ringMsg   = {};
            var darkness  = 0;
            
            if (node.enableAmbientLight) {
                darkness = node.isDark(node.lightLevel, node.lowlightthreshold_ambience, node.highlightthreshold_ambience);
            }

            switch (darkness) {
                case 0:                 // not dark
                    centerMsg = node.createMessageOff();
                    ringMsg   = node.createMessageOff();
                    break;

                case 1:                 // it's dark
                    centerMsg = node.createAmbientColor(); //node.createMessageBlue(node.ambientbrightness);
                    ringMsg   = node.createMessageOff();
                    break;

                case -1:
                    centerMsg = null;
                    ringMsg   = null;
                    break;
            }

            node.send([ringMsg, centerMsg, null, null, null, null]);
        }
        /******************************************************************************************************************
         * animation messages
         *
         */
        this.createAnimationOff = function() {
            var msg = {
                topic: "animation",
                payload: {
                    animation: "off"
                }
            };
            
            return msg;            
        }
        this.createAnimation = function(animation, color, speed, maxOut) {
            var msg = {
                topic: "animation",
                payload: {
                    animation: animation,
                    color:     color,
                    speed:     speed,
                    max_out:   maxOut
                }
            };
            
            return msg;            
        }
        /******************************************************************************************************************
         * color messages to lightbulbs
         *
         */
        this.createAmbientColor = function() {
            return node.createColorMessage(node.ambienthue, node.ambientsaturation, node.ambientbrightness);
        }
        //
        //
        this.createMessageOn = function() {
            var msg = {
                topic: "On",
                payload: {
                    on: true
                }
            };
            
            return msg;
        }
        //
        //
        this.createMessageOff = function() {
            var msg = {
                topic: "On",
                payload: {
                    on: false
                }
            };
            
            return msg;
        }
        //
        //
        this.createMessageWhite = function(brightness) {
            var hue        = 0.0;
            var saturation = 0.0;

            if(typeof brightness === "undefined") {
                brightness = 100;
            }
            
            return node.createColorMessage(hue, saturation, brightness);
        }
        //
        //
        this.createMessageRed = function(brightness) {
            var hue        = 0.0;
            var saturation = 100.0;

            if(typeof brightness === "undefined") {
                brightness = 100;
            }

            return node.createColorMessage(hue, saturation, brightness);
        }
        //
        //
        this.createMessageGreen = function(brightness) {
            var hue        = 120.0;
            var saturation = 100.0;

            if(typeof brightness === "undefined") {
                brightness = 100;
            }

            return node.createColorMessage(hue, saturation, brightness);
        }
        //
        //
        this.createMessageBlue = function(brightness) {
            var hue        = 240.0;
            var saturation = 100.0;
            
            if(typeof brightness === "undefined") {
                brightness = 100;
            }

            return node.createColorMessage(hue, saturation, brightness);
        }
        //
        //
        this.createColorMessage = function(hue, saturation, brightness) {
            var payload = {
                on: true,
                hue: hue,
                saturation: saturation,
                brightness: brightness
            };
            
            var msg = {
                topic: "All",
                payload: payload
            };
            
            return msg;
        }

        // make sure animation is off at startup
        //var animOff = node.createAnimationOff();
        //node.send([null, null, null, null, animOff, animOff]);
    }
    
    RED.nodes.registerType('util-carport', UtilCarportNode)
}

