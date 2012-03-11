// -*- Javascript -*-
'use strict'

// The richards benchmark, a standard os-ish simulation,
// originally by Martin Richards.
//
// It takes a print function, a task (v7 might work),
// and a boolean, tracing, to tell whether we're tracing.
function Richards(print, task, tracing) {
    var scheduler
    
    // configuration and constants
    var count = 10000
    var queuepacketcountval = 23246
    var holdcountvar = 9297
    var BUFSIZE = 3
    
    var I_IDLE = 'idle'
    var I_WORK = 'work'
    var I_HANDLERA = 'handlera'
    var I_HANDLERB = 'handlerb'
    var I_DEVA = 'deva'
    var I_DEVB = 'devb'
    
    var K_DEV = 1
    var K_WORK = 2
    
    function Packet(source, destination, kind) {
	var i
	
	this.source = source
	this.destination = destination
	this.kind = kind
	this.a1 = 0
	this.a2 = [] // TODO: is there a better array constructor?
	for (i= 0; i < BUFSIZE; ++i) {
	    this.a2.push(0)
	}
    }
    Packet.prototype.swap_source_and_destination = function () {
	var temp = this.source
	this.source = this.destination
	this.destination = temp
    }
    Packet.prototype.toString = function () {
	return 'Packet('+this.source+', '+this.destination+')'
    }

    var current_line = ''
    function trace(a) {
	if (tracing) {
	    current_line += a
	    if (current_line.length >= 50) {
		print(current_line)
		current_line = ''
	    }
	}
    }
    function end_current_line() {
	if (current_line.length > 0) {
	    print(current_line)
	    current_line = ''
	}
    }

    var MAXINT = 32767
    function Idle() {
	this.random_state = 1
	this.idle_steps_remaining = count
    }
    Idle.prototype.step = function (scheduler, possible_message) {
	var command = scheduler.run()

	this.idle_steps_remaining -= 1
	if (this.idle_steps_remaining === 0) {
	    command.stop()
	} else {
	    if ((this.random_state & 1) === 0) {
		this.random_state = (this.random_state >> 1) & MAXINT
		command.send(I_DEVA, 'release')
	    } else {
		this.random_state = ((this.random_state >> 1) & MAXINT) ^ 0xD008
		command.send(I_DEVB, 'release')
	    }
	}
	return command
    }
    var alphabet = "0ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    function Worker() {
	this.current_handler = I_HANDLERA
	this.alphabet_position = 0
    }
    Worker.prototype.step = function (scheduler, possible_message) {
	var i
	var command = scheduler.wait()
	if (possible_message) {
	    // swap back and forth between handlers
	    if (this.current_handler === I_HANDLERA) {
		this.current_handler = I_HANDLERB
	    } else {
		this.current_handler = I_HANDLERA
	    }
	    possible_message.destination = this.current_handler
	    possible_message.a1 = 0
	    for (i = 0; i <= BUFSIZE; ++i) {
		this.alphabet_position += 1
		if (this.alphabet_position > 26) {
		    this.alphabet_position = 1
		}
		(possible_message.a2)[i] = alphabet[this.alphabet_position]
	    }
	    possible_message.source = I_WORK
	    command.send(possible_message.destination, possible_message)
	}
	return command
    }
    function Handler() {
	this.work_packets = []
	this.device_packets = []
    }
    Handler.prototype.step = function (scheduler, possible_message) {
	var device_packet
	var command = scheduler.wait()
	if (possible_message) {
	    if (possible_message.kind === K_WORK) {
		this.work_packets.push(possible_message)
	    } else {
		this.device_packets.push(possible_message)
	    }
	}
	if (this.work_packets.length > 0) {
	    if (this.work_packets[0].a1 > BUFSIZE) {
		this.work_packets.shift()
	    } else if (this.device_packets.length > 0) {
		device_packet = this.device_packets.shift()
		device_packet.a1 = this.work_packets[0].a2[this.work_packets[0].a1]
		this.work_packets[0].a1 += 1
		command.send(device_packet.destination, device_packet)
	    } else {
		// nothing to do
	    }
	} else {
	    // nothing to do
	}
	return command
    }
    function Device() {
	this.held_packets = []
    }
    Device.prototype.step = function (scheduler, possible_message) {
	var outgoing_message
	var command = scheduler.wait() // for a message
	if (possible_message === 'release') {
	    if (this.held_packets.length > 0) {
		outgoing_message = this.held_packets.shift()
		outgoing_message.swap_source_and_destination()
		command.send(outgoing_message.destination, outgoing_message); 
	    } else {
		// released twice?
	    }
	} else if (possible_message) {
	    this.held_packets.push(possible_message)
	    trace(possible_message.a1)
	} else {
	    print('device run without a message?')
	}
	return command
    }

    // okay, now we really do it
    // TODO: packets need both source and destination!
    print('Bench mark starting')
    scheduler = new task.Scheduler()
    scheduler.spawn(I_IDLE, 0, new Idle())
    scheduler.send(I_IDLE, 'go') // TODO: should this be here?
    scheduler.spawn(I_WORK, 1, new Worker())
    scheduler.send(I_WORK, new Packet(0, 0, K_WORK))
    scheduler.send(I_WORK, new Packet(0, 0, K_WORK))
    scheduler.spawn(I_HANDLERA, 2, new Handler())
    scheduler.send(I_HANDLERA, new Packet(I_HANDLERA, I_DEVA, K_DEV))
    scheduler.send(I_HANDLERA, new Packet(I_HANDLERA, I_DEVA, K_DEV))
    scheduler.send(I_HANDLERA, new Packet(I_HANDLERA, I_DEVA, K_DEV))
    scheduler.spawn(I_HANDLERB, 3, new Handler())
    scheduler.send(I_HANDLERB, new Packet(I_HANDLERB, I_DEVB, K_DEV))
    scheduler.send(I_HANDLERB, new Packet(I_HANDLERB, I_DEVB, K_DEV))
    scheduler.send(I_HANDLERB, new Packet(I_HANDLERB, I_DEVB, K_DEV))
    scheduler.spawn(I_DEVA, 4, new Device())
    scheduler.spawn(I_DEVB, 5, new Device())
    print('Starting')
    print('')
    while (scheduler.running) {
	scheduler.step()
    }
    // flush the trace
    end_current_line()

    print('finished')
    // TODO: compare measured counts to correct golden counts
    print('end of run')
}