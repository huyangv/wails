/*
 _       __      _ __
| |     / /___ _(_) /____
| | /| / / __ `/ / / ___/
| |/ |/ / /_/ / / (__  )
|__/|__/\__,_/_/_/____/
The electron alternative for Go
(c) Lea Anthony 2019-present
*/
/* jshint esversion: 6 */

// Defines a single listener with a maximum number of times to callback

/**
 * The Listener class defines a listener! :-)
 *
 * @class Listener
 */
class Listener {
    /**
     * Creates an instance of Listener.
     * @param {function} callback
     * @param {number} maxCallbacks
     * @memberof Listener
     */
    constructor(callback, maxCallbacks) {
        // Default of -1 means infinite
        maxCallbacks = maxCallbacks || -1;
        // Callback invokes the callback with the given data
        // Returns true if this listener should be destroyed
        this.Callback = (data) => {
            callback.apply(null, data);
            // If maxCallbacks is infinite, return false (do not destroy)
            if (maxCallbacks === -1) {
                return false;
            }
            // Decrement maxCallbacks. Return true if now 0, otherwise false
            maxCallbacks -= 1;
            return maxCallbacks === 0;
        };
    }
}

export const eventListeners = {};

/**
 * Registers an event listener that will be invoked `maxCallbacks` times before being destroyed
 *
 * @export
 * @param {string} eventName
 * @param {function} callback
 * @param {number} maxCallbacks
 */
export function EventsOnMultiple(eventName, callback, maxCallbacks) {
    eventListeners[eventName] = eventListeners[eventName] || [];
    const thisListener = new Listener(callback, maxCallbacks);
    eventListeners[eventName].push(thisListener);
}

/**
 * Registers an event listener that will be invoked every time the event is emitted
 *
 * @export
 * @param {string} eventName
 * @param {function} callback
 */
export function EventsOn(eventName, callback) {
    EventsOnMultiple(eventName, callback, -1);
}

/**
 * Registers an event listener that will be invoked once then destroyed
 *
 * @export
 * @param {string} eventName
 * @param {function} callback
 */
export function EventsOnce(eventName, callback) {
    EventsOnMultiple(eventName, callback, 1);
}

function notifyListeners(eventData) {

    // Get the event name
    let eventName = eventData.name;

    // Check if we have any listeners for this event
    if (eventListeners[eventName]) {

        // Keep a list of listener indexes to destroy
        const newEventListenerList = eventListeners[eventName].slice();

        // Iterate listeners
        for (let count = 0; count < eventListeners[eventName].length; count += 1) {

            // Get next listener
            const listener = eventListeners[eventName][count];

            let data = eventData.data;

            // Do the callback
            const destroy = listener.Callback(data);
            if (destroy) {
                // if the listener indicated to destroy itself, add it to the destroy list
                newEventListenerList.splice(count, 1);
            }
        }

        // Update callbacks with new list of listeners
        eventListeners[eventName] = newEventListenerList;
    }
}

/**
 * Notify informs frontend listeners that an event was emitted with the given data
 *
 * @export
 * @param {string} notifyMessage - encoded notification message

 */
export function EventsNotify(notifyMessage) {
    // Parse the message
    let message;
    try {
        message = JSON.parse(notifyMessage);
    } catch (e) {
        const error = 'Invalid JSON passed to Notify: ' + notifyMessage;
        throw new Error(error);
    }
    notifyListeners(message);
}

/**
 * Emit an event with the given name and data
 *
 * @export
 * @param {string} eventName
 */
export function EventsEmit(eventName) {

    const payload = {
        name: eventName,
        data: [].slice.apply(arguments).slice(1),
    };

    // Notify JS listeners
    notifyListeners(payload);

    // Notify Go listeners
    window.WailsInvoke('EE' + JSON.stringify(payload));
}

function removeListener(eventName) {
    // Remove local listeners
    delete eventListeners[eventName];

    // Notify Go listeners
    window.WailsInvoke('EX' + eventName);
}

/**
 * Off unregisters a listener previously registered with On,
 * optionally multiple listeneres can be unregistered via `additionalEventNames`
 * 
 * @param {string} eventName 
 * @param  {...string} additionalEventNames 
 */
export function EventsOff(eventName, ...additionalEventNames) {
    removeListener(eventName)
    
    if (additionalEventNames.length > 0) {
        additionalEventNames.forEach(eventName => {
            removeListener(eventName)
        })
    }
}