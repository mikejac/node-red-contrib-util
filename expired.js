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

// https://github.com/eclipse/paho.mqtt.javascript/blob/master/src/paho-mqtt.js

var Timer = function () {
};

exports.Timer = Timer;

// private instance members
Timer.prototype._interval_ms       = 0;
Timer.prototype._interval_start_ms = 0;

// public instance members
Timer.prototype.expired = function() {
    if (this._interval_ms == 0) {
        return false;
    }

    var now = new Data();
    
    if (now - (this._interval_start_ms + this._interval_ms) > 0) {
        return true;
    }

    return false;
};

Timer.prototype.enabled = function() {
    if (this._interval_ms == 0) {
        return false;
    }

    return true;
};

Timer.prototype.countdown_ms = function(ms) {
    this._interval_ms       = ms;
    this._interval_start_ms = new Date();;
};

Timer.prototype.countdown = function(seconds) {
    this._interval_ms       = seconds * 1000;
    this._interval_start_ms = new Date();;
};

Timer.prototype.left_ms = function() {
    var now = new Data();
    
    return now - (this._interval_start_ms + this._interval_ms);
};

//exports.Timer = Timer;

//var XX = (function (global) {
//module.exports.PahoMQTT = (function (global) {
//module.exports.TimerX = function() {
/*module.exports.x = {
};*/


	/*var Timeout = function (client, window, timeoutSeconds, action, args) {
		this._window = window;
		if (!timeoutSeconds)
			timeoutSeconds = 30;

		var doTimeout = function (action, client, args) {
			return function () {
				return action.apply(client, args);
			};
		};
		this.timeout = setTimeout(doTimeout(action, client, args), timeoutSeconds * 1000);

		this.cancel = function() {
			this._window.clearTimeout(this.timeout);
		};
    };*/
    

    /*
char expired(Timer* timer)
{
    if(timer->interval_ms == 0) {
        return 0;
    }
    
    return (millis() - timer->interval_start_ms >= timer->interval_ms) ? 1 : 0;
}
char enabled(Timer* timer)
{
    return (timer->interval_ms == 0) ? 0 : 1;
}
void countdown_ms(Timer* timer, unsigned long ms)
{
    timer->interval_ms       = ms;
    timer->interval_start_ms = millis();
}
void countdown(Timer* timer, unsigned int seconds)
{
    countdown_ms(timer, (unsigned long)seconds * 1000L);
}
int left_ms(Timer* timer)
{
    return millis() - (timer->interval_start_ms + timer->interval_ms);
    //return timer->interval_end_ms - millis();
}
void InitTimer(Timer* timer)
{
    timer->interval_ms       = 0;
    timer->interval_start_ms = 0;
}

*/

