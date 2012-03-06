// Based on M. J. Jordan and M. Richards 'bench.c' version of the richards benchmark.
// Adaptation from C to JS by Johnicholas Hines

'use strict';

// wierd globals
var taskid
var v1
var v2

var Count = 10000
var Qpktcountval = 23246
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
// p_link, which goes to another packet or NULL
// p_id, which is an integer
// p_kind, which is another integer
// p_a1, which is an integer
// p_a2, which is a string - not longer than BUFSIZE

// task is a table with:
// t_link, which goes to another task or NULL
// t_id which is an integer
// t_pri which is an integer
// t_wkq which is a packet or NULL
// t_fn which is a task object
// t_v1 which is a number
// t_v2 which is a number

// forward declarations aren't actually necessary
// append is a function that takes a packet (considered as a list)
// and a packet (considered as a single packet).

var tasklist = null
var tasktab = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
function Task(id, priority, workqueue, state, task, v1, v2) {
    this.t_link = tasklist
    this.t_id = id
    this.t_pri = priority
    this.t_wkq = workqueue
    this.t_state = state
    this.t_fn = task
    this.t_v1 = v1
    this.t_v2 = v2
    tasklist = this
    tasktab[id] = this
}

function Packet(link, id, kind) {
    this.p_link = link
    this.p_id = id
    this.p_kind = kind
    this.p_a1 = 0
    this.p_a2 = [0, 0, 0] // Note: BUFSIZE
}

var tracing = true
var current_line = ''
function trace(a) {
    current_line = current_line + a
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
	var pkt = null
	var newtcb
	if (tcb.t_state.hold === false &&
	    tcb.t_state.wait === true &&
	    tcb.t_state.pkt === true) {
	    tcb.t_state.wait = false
            pkt = tcb.t_wkq
            tcb.t_wkq = pkt.p_link
	    if (tcb.t_wkq) {
		tcb.t_state.pkt = true
	    } else {
		tcb.t_state.pkt = false
	    }
            taskid = tcb.t_id
	    // unpack the stored locals into globals
            v1 = tcb.t_v1
            v2 = tcb.t_v2
            if (tracing) {
		trace(taskid)
	    }
	    newtcb = tcb.t_fn(pkt)
	    // repack the globals into stored locals
	    tcb.t_v1 = v1
	    tcb.t_v2 = v2
	    tcb = newtcb
	} else if (tcb.t_state.hold === false &&
		   tcb.t_state.wait === false) {
            taskid = tcb.t_id
	    // unpack the stored locals into globals
            v1 = tcb.t_v1
            v2 = tcb.t_v2
            if (tracing) {
		trace(taskid)
	    }
	    newtcb = tcb.t_fn(pkt)
	    // repack the globals into stored locals
	    tcb.t_v1 = v1
	    tcb.t_v2 = v2
	    tcb = newtcb
	} else {
	    tcb = tcb.t_link
	}
    }
}

function wait() {
    tcb.t_state.wait = true
    return tcb
}

function holdself() {
    holdcount += 1
    tcb.t_state.hold = true
    return tcb.t_link
}

function release(id) {
    var t = tasktab[id];
    if (t === null) {
	return null
    }
    t.t_state.hold = false
    if (t.t_pri > tcb.t_pri) {
	return t
    } else {
	return tcb
    }
}

function qpkt(pkt) {
    var t = tasktab[pkt.p_id];
    if (t === null) {
	return null
    }
    qpktcount += 1
    pkt.p_link = null
    pkt.p_id = taskid
    if (t.t_wkq) {
	t.t_wkq = append(pkt, t.t_wkq)
    } else {
	t.t_wkq = pkt
	t.t_state.pkt = true
	if (t.t_pri > tcb.t_pri) {
	    return t
	}
    }
    return tcb
}

var MAXINT = 32767
function idlefn(pkt) {
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
function workfn(pkt) {
    if (pkt) {
	// swap back and forth between I_HANDLERA and I_HANDLERB
	v1 = I_HANDLERA + I_HANDLERB - v1;

	pkt.p_id = v1
	pkt.p_a1 = 0
	for (var i = 0; i <= BUFSIZE; ++i) {
	    v2 += 1
	    if (v2 > 26) {
		v2 = 1
	    }
	    (pkt.p_a2)[i] = alphabet[v2]
        }
	return qpkt(pkt)
    } else {
	return wait()
    }
}

function handlerfn(pkt) {
    if (pkt) {
	if (pkt.p_kind === K_WORK) {
	    v1 = append(pkt, v1)
	} else {
	    v2 = append(pkt, v2)
	}
    }
    if (v1) {
	var workpkt = v1
	var count = workpkt.p_a1
	if (count > BUFSIZE) {
	    v1 = v1.p_link
	    return qpkt(workpkt)
	} else if (v2) {
	    var devpkt = v2
	    v2 = v2.p_link
	    devpkt.p_a1 = workpkt.p_a2[count]
	    workpkt.p_a1 = count+1
	    return qpkt(devpkt)
	} else {
	    return wait()
	}
    } else {
	return wait()
    }
}

function devfn(pkt) {
    if (pkt) {
	v1 = pkt
	if (tracing) {
	    trace(pkt.p_a1)
	}
	return holdself()
    } else {
	if (v1) {
	    pkt = v1
	    v1 = null
	    return qpkt(pkt)
	} else {
	    return wait()
	}
    }
}

function append(pkt, ptr) {
    pkt.p_link = null
    if (ptr) {
	var peek
	var next = ptr
	while (peek = next.p_link) {
	    next = peek
	}
	next.p_link = pkt
	return ptr
    } else {
	return pkt
    }
}

print("Bench mark starting")

var idle = new Task(I_IDLE, 0, null, { hold: false, wait: false, pkt: false }, idlefn, 1, Count)

var wkq = new Packet(new Packet(null, 0, K_WORK), 0, K_WORK)

var worker = new Task(I_WORK, 1000, wkq, { hold: false, wait: true, pkt: true }, workfn, I_HANDLERA, 0)

wkq = new Packet(new Packet(null, I_DEVA, K_DEV), I_DEVA, K_DEV)
wkq = new Packet(wkq, I_DEVA, K_DEV)

var handler_a = new Task(I_HANDLERA, 2000, wkq, { hold: false, wait: true, pkt: true }, handlerfn, null, null)

wkq = new Packet(null, I_DEVB, K_DEV)
wkq = new Packet(wkq, I_DEVB, K_DEV)
wkq = new Packet(wkq, I_DEVB, K_DEV)

var handler_b = new Task(I_HANDLERB, 3000, wkq, { hold: false, wait: true, pkt: true }, handlerfn, null, null)

var device_a = new Task(I_DEVA, 4000, null, { hold: false, wait: true, pkt: false }, devfn, 0, 0)
var device_b = new Task(I_DEVB, 5000, null, { hold: false, wait: true, pkt: false }, devfn, 0, 0)

print('Starting')
print('')

var qpktcount = 0
var holdcount = 0
var tcb = tasklist
schedule()
end_current_line()

print('finished')
print('qpkt count = '+qpktcount+'  holdcount = '+holdcount)
print('These results are '+((qpktcount === Qpktcountval && holdcount === Holdcountval)?'correct':'incorrect'))
print('end of run')
