// Based on M. J. Jordan and M. Richards 'bench.c' version of the richards benchmark.
// Adaptation from C to JS by Johnicholas Hines

'use strict';

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
//   id, which is an integer
//   kind, which is another integer
//   a1, which is an integer
//   a2, which is a string - not longer than BUFSIZE

// task is a table with:
//   id which is an integer (one of the I_WHATEVER enums)
//   priority which is an integer
//   workqueue which is a packet or NULL
//   task which is a task object

var tasktab = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
function Task(id, priority, workqueue, task) {
    this.id = id
    this.priority = priority
    this.workqueue = workqueue
    this.hold = false
    this.wait = true
    this.task = task

    tasktab[id] = this
}

function Packet(id, kind) {
    this.id = id
    this.kind = kind
    this.a1 = 0
    this.a2 = [0, 0, 0] // Note: BUFSIZE
}

var tracing = true
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
function Scheduler(initial_tcb) {
    initial_tcb.wait = false
    this.tcb = initial_tcb
    this.runnables = []
}
Scheduler.prototype.add = function (tcb) {
    this.runnables.unshift(tcb)
}
Scheduler.prototype.schedule = function () {
    while (this.tcb) {
	if (this.tcb.hold) {
	    // skipping because held
	    this.tcb = this.runnables.shift()
	} else if (this.tcb.wait && this.tcb.workqueue) {
	    this.tcb.wait = false
            var packet = this.runnables[0].workqueue.shift()
            if (tracing) {
		trace(this.tcb.id)
	    }
	    this.tcb.task.run(this, packet)
	} else if (this.tcb.wait === false) {
            if (tracing) {
		trace(this.tcb.id)
	    }
	    this.tcb.task.run(this)
	} else {
	    // skipping because waiting and no incoming packets
	    this.tcb = this.runnables.shift()
	}
    }
}
Scheduler.prototype.wait = function () {
    this.tcb.wait = true
}
Scheduler.prototype.holdself = function () {
    holdcount += 1
    this.tcb.hold = true
    this.runnables.shift()
}
Scheduler.prototype.release = function (id) {
    var t = tasktab[id];
    if (t === null) {
	print('hello')
	this.tcb = null
    } else {
	t.hold = false
	if (t.priority > this.tcb.priority) {
	    this.tcb = t
	} else {
	    this.tcb = this.tcb
	}
    }
}
Scheduler.prototype.queuepacket = function (packet) {
    var t = tasktab[packet.id];
    if (t === null) {
	print('hello')
	this.tcb = null
    } else {
	queuepacketcount += 1
	packet.id = this.tcb.id
	t.workqueue.push(packet)
	if (t.workqueue.length == 1) {
	    if (t.priority > this.tcb.priority) {
		this.tcb = t
		return
	    }
	}
	this.tcb = this.tcb
    }
}

var MAXINT = 32767
function Idle() {
    this.v1 = 1
    this.v2 = Count
}
Idle.prototype.run = function (scheduler, packet) {
    this.v2 -= 1
    if (this.v2 === 0) {
	scheduler.holdself()
    } else {
	if ((this.v1 & 1) === 0) {
	    this.v1 = (this.v1 >> 1) & MAXINT
	    scheduler.release(I_DEVA)
	} else {
	    this.v1 = ((this.v1 >> 1) & MAXINT) ^ 0xD008
	    scheduler.release(I_DEVB)
	}
    }
}

var alphabet = "0ABCDEFGHIJKLMNOPQRSTUVWXYZ"
function Worker() {
    this.v1 = I_HANDLERA
    this.v2 = 0
}
Worker.prototype.run = function (scheduler, packet) {
    if (packet) {
	// swap back and forth between I_HANDLERA and I_HANDLERB
	this.v1 = I_HANDLERA + I_HANDLERB - this.v1;
	packet.id = this.v1
	packet.a1 = 0
	for (var i = 0; i <= BUFSIZE; ++i) {
	    this.v2 += 1
	    if (this.v2 > 26) {
		this.v2 = 1
	    }
	    (packet.a2)[i] = alphabet[this.v2]
        }
	scheduler.queuepacket(packet)
    } else {
	scheduler.wait()
    }
}

function Handler() {
    this.v1 = []
    this.v2 = []
}
Handler.prototype.run = function (scheduler, packet) {
    if (packet) {
	if (packet.kind === K_WORK) {
	    this.v1.push(packet)
	} else {
	    this.v2.push(packet)
	}
    }
    if (this.v1) {
	var workpacket = this.v1
	var count = workpacket.a1
	if (count > BUFSIZE) {
	    this.v1.shift()
	    scheduler.queuepacket(workpacket)
	} else if (this.v2) {
	    var devpacket = this.v2.shift()
	    this.v2 = this.v2.link
	    devpacket.a1 = workpacket.a2[count]
	    workpacket.a1 = count+1
	    scheduler.queuepacket(devpacket)
	} else {
	    scheduler.wait()
	}
    } else {
	scheduler.wait()
    }
}

function Device() {
    this.v1 = null
}
Device.prototype.run = function (scheduler, packet) {
    if (packet) {
	this.v1 = packet
	if (tracing) {
	    trace(packet.a1)
	}
	scheduler.holdself()
    } else {
	if (this.v1) {
	    packet = this.v1
	    this.v1 = null
	    scheduler.queuepacket(packet)
	} else {
	    scheduler.wait()
	}
    }
}

function packet_queue(count, id, kind) {
    var accumulator = null
    for (var i = 0; i < count; ++i) {
	accumulator = new Packet(accumulator, id, kind)
    }
    return accumulator
}

print("Bench mark starting")

var scheduler = new Scheduler(new Task(I_IDLE, 0, [], new Idle()))
scheduler.add(new Task(I_WORK, 1000, packet_queue(2, 0, K_WORK), new Worker()))
scheduler.add(new Task(I_HANDLERA, 2000, packet_queue(3, I_DEVA, K_DEV), new Handler()))
scheduler.add(new Task(I_HANDLERB, 3000, packet_queue(3, I_DEVB, K_DEV), new Handler()))
scheduler.add(new Task(I_DEVA, 4000, null, new Device()))
scheduler.add(new Task(I_DEVB, 5000, null, new Device()))

print('Starting')
print('')

var queuepacketcount = 0
var holdcount = 0
scheduler.schedule()
end_current_line()

print('finished')
print('queuepacket count = '+queuepacketcount+'  holdcount = '+holdcount)
print('These results are '+((queuepacketcount === QUEUEpacketcountval && holdcount === Holdcountval)?'correct':'incorrect'))
print('end of run')
