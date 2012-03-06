// Based on M. J. Jordan and M. Richards 'bench.c' version of the richards benchmark.
// Adaptation from C to JS by Johnicholas Hines

'use strict';

// weird globals
var taskid
var v1
var v2

var Count = 10000
var QUEUEpacketcountval = 23246
var Holdcountval = 9297

var BUFSIZE = 3
var I_IDLE = 1
var I_WORK = 2
var I_HANDLERA = 3
var I_HANDLERB = 4
var I_DEVA = 5
var I_DEVB = 6

var K_DEV = 1000
var K_WORK = 1001

// packet is a table with:
//   link, which goes to another packet or NULL
//   id, which is an integer
//   kind, which is another integer
//   a1, which is an integer
//   a2, which is a string - not longer than BUFSIZE

// task is a table with:
//   link, which goes to another task or NULL
//   id which is an integer
//   pri which is an integer
//   wkqueue which is a packet or NULL
//   fn which is a task object
//   v1 which is a number
//   v2 which is a number

var tasklist = null
var tasktab = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
function Task(id, priority, workqueue, task, v1, v2) {
    this.link = tasklist
    this.id = id
    this.pri = priority
    this.wkqueue = workqueue
    this.state_hold = false
    this.state_wait = true
    this.fn = task
    this.v1 = v1
    this.v2 = v2
    tasklist = this
    tasktab[id] = this
}

function Packet(link, id, kind) {
    this.link = link
    this.id = id
    this.kind = kind
    this.a1 = 0
    this.a2 = [0, 0, 0] // Note: BUFSIZE
}

var tracing = false
var current_line = ''
function trace(a) {
    current_line += a
    if (current_line.length >= 50) {
	print(current_line)
	current_line = ''
    }
}

function end_current_line() {
    if (current_line.length > 0) {
	print(current_line)
	current_line = ''
    }
}

function schedule() {
    while (tcb) {
	var packet = null
	var newtcb
	if (tcb.state_hold) {
	    // skipping because held
	    tcb = tcb.link
	} else if (tcb.state_wait && tcb.wkqueue) {
	    tcb.state_wait = false
            packet = tcb.wkqueue
            tcb.wkqueue = packet.link
            taskid = tcb.id
	    // unpack the stored locals into globals
            v1 = tcb.v1
            v2 = tcb.v2
            if (tracing) {
		trace(taskid)
	    }
	    newtcb = tcb.fn(packet)
	    // repack the globals into stored locals
	    tcb.v1 = v1
	    tcb.v2 = v2
	    tcb = newtcb
	} else if (tcb.state_wait === false) {
            taskid = tcb.id
	    // unpack the stored locals into globals
            v1 = tcb.v1
            v2 = tcb.v2
            if (tracing) {
		trace(taskid)
	    }
	    newtcb = tcb.fn(packet)
	    // repack the globals into stored locals
	    tcb.v1 = v1
	    tcb.v2 = v2
	    tcb = newtcb
	} else {
	    // skipping because waiting and no incoming packets
	    tcb = tcb.link
	}
    }
}

function wait() {
    tcb.state_wait = true
    return tcb
}

function holdself() {
    holdcount += 1
    tcb.state_hold = true
    return tcb.link
}

function release(id) {
    var t = tasktab[id];
    if (t === null) {
	return null
    }
    t.state_hold = false
    if (t.pri > tcb.pri) {
	return t
    } else {
	return tcb
    }
}

function queuepacket(packet) {
    var t = tasktab[packet.id];
    if (t === null) {
	return null
    }
    queuepacketcount += 1
    packet.link = null
    packet.id = taskid
    if (t.wkqueue) {
	t.wkqueue = append(packet, t.wkqueue)
    } else {
	t.wkqueue = packet
	if (t.pri > tcb.pri) {
	    return t
	}
    }
    return tcb
}

var MAXINT = 32767
function idlefn(packet) {
    v2 -= 1
    if (v2 === 0) {
	return holdself()
    }
    if ((v1 & 1) === 0) {
	v1 = (v1 >> 1) & MAXINT
	return release(I_DEVA)
    } else {
	v1 = ((v1 >> 1) & MAXINT) ^ 0xD008
	return release(I_DEVB)
    }
}

var alphabet = "0ABCDEFGHIJKLMNOPQRSTUVWXYZ"
function workfn(packet) {
    if (packet) {
	// swap back and forth between I_HANDLERA and I_HANDLERB
	v1 = I_HANDLERA + I_HANDLERB - v1;

	packet.id = v1
	packet.a1 = 0
	for (var i = 0; i <= BUFSIZE; ++i) {
	    v2 += 1
	    if (v2 > 26) {
		v2 = 1
	    }
	    (packet.a2)[i] = alphabet[v2]
        }
	return queuepacket(packet)
    } else {
	return wait()
    }
}

function handlerfn(packet) {
    if (packet) {
	if (packet.kind === K_WORK) {
	    v1 = append(packet, v1)
	} else {
	    v2 = append(packet, v2)
	}
    }
    if (v1) {
	var workpacket = v1
	var count = workpacket.a1
	if (count > BUFSIZE) {
	    v1 = v1.link
	    return queuepacket(workpacket)
	} else if (v2) {
	    var devpacket = v2
	    v2 = v2.link
	    devpacket.a1 = workpacket.a2[count]
	    workpacket.a1 = count+1
	    return queuepacket(devpacket)
	} else {
	    return wait()
	}
    } else {
	return wait()
    }
}

function devfn(packet) {
    if (packet) {
	v1 = packet
	if (tracing) {
	    trace(packet.a1)
	}
	return holdself()
    } else {
	if (v1) {
	    packet = v1
	    v1 = null
	    return queuepacket(packet)
	} else {
	    return wait()
	}
    }
}

// append takes a packet (considered as a single packet)
// and packet considered as a list, and puts the 
// former at the end of the latter.
function append(packet, ptr) {
    packet.link = null
    if (ptr) {
	var peek
	var next = ptr
	while (peek = next.link) {
	    next = peek
	}
	next.link = packet
	return ptr
    } else {
	return packet
    }
}

function make_packet_queue(count, id, kind) {
    var accumulator = null
    for (var i = 0; i < count; ++i) {
	accumulator = new Packet(accumulator, id, kind)
    }
    return accumulator
}

print("Bench mark starting")

var idle = new Task(I_IDLE, 0, null, idlefn, 1, Count)
idle.state_wait = false // the idle task starts out running
var worker = new Task(I_WORK, 1000, make_packet_queue(2, 0, K_WORK), workfn, I_HANDLERA, 0)
var handler_a = new Task(I_HANDLERA, 2000, make_packet_queue(3, I_DEVA, K_DEV), handlerfn, null, null)
var handler_b = new Task(I_HANDLERB, 3000, make_packet_queue(3, I_DEVB, K_DEV), handlerfn, null, null)
var device_a = new Task(I_DEVA, 4000, null, devfn, 0, 0)
var device_b = new Task(I_DEVB, 5000, null, devfn, 0, 0)

print('Starting')
print('')

var queuepacketcount = 0
var holdcount = 0
var tcb = tasklist
schedule()
end_current_line()

print('finished')
print('queuepacket count = '+queuepacketcount+'  holdcount = '+holdcount)
print('These results are '+((queuepacketcount === QUEUEpacketcountval && holdcount === Holdcountval)?'correct':'incorrect'))
print('end of run')
