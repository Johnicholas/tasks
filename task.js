// Scheduler is an interface describing something that can produce SchedulerCommands.
// Scheduler has a run() method that produces a SchedulerCommand.
//  "I am yielding control but I am ready to run again."
// Scheduler has a wait() method that produces a SchedulerCommand.
//  "Wake me up when someone sends a message to me."
// Scheduler has a sleep(interval) method that produces a SchedulerCommand.
//  "Wake me up after this interval of time."
// Scheduler has a acquire(resource) method that produces a SchedulerCommand.
//  "Put me on the list for this resource, and wake me when I can have it."
// Note: there is no 'die' method, though it might be reasonable.
//
// SchedulerCommand is an interface.
// SchedulerCommand has a stop() method that returns nothing.
//  "Stop everything, we're done here."
// SchedulerCommand has a send(to_whom, message) method that returns nothing.
//  "Please deliver this to so-and-so."
// SchedulerCommand has a release(resource) method that returns nothing.
//  "I'm done with this, you can give it to someone else."
// Note: there is no 'spawn' method, though it might be reasonable.
//
// RecordSchedulerCommand is an implementation of SchedulerCommand
// that records what mutators were called on it.
function RecordSchedulerCommand(initial) {
    this.record = [initial]
}
RecordSchedulerCommand.prototype.stop = function () {
    this.record.unshift(['stop'])
}
RecordSchedulerCommand.prototype.send = function (address, message) {
    this.record.unshift(['send', address, message])
}
RecordSchedulerCommand.prototype.release = function (resource) {
    this.record.unshift(['release', resource])
}
RecordSchedulerCommand.prototype.toString = function () {
    return this.record.toString()
}
    
// RecordScheduler is an implementation of Scheduler 
// that produces RecordSchedulerCommands.
function RecordScheduler() {
}
RecordScheduler.prototype.run = function () {
    return new RecordSchedulerCommand(['run'])
}
RecordScheduler.prototype.wait = function () {
    return new RecordSchedulerCommand(['wait'])
}
RecordScheduler.prototype.sleep = function (interval) {
    return new RecordSchedulerCommand(['sleep', interval])
}
RecordScheduler.prototype.acquire = function (resource) {
    return new RecordSchedulerCommand(['acquire', resource])
}

// A task is an interface
// A task has a method, step, that takes a Scheduler and possibly a message
// and returns a SchedulerCommand produced from that Scheduler.
// It should not keep the Scheduler around.
//
// Chores is an example task, using a simple switch-based state machine.
function Chores() {
    this.state = 0
}
Chores.prototype.step = function (scheduler, message) {
    var answer;
    switch (this.state) {
    case 0:
	answer = scheduler.acquire('human')
	this.state = 1
	break
    case 1:
	answer = scheduler.wait()
	answer.send('human', 'time to chop the wood')
	this.state = 2
	break
    case 2:
	// assume the message is correct for now
	answer = scheduler.acquire('human')
	answer.release('human')
	this.state = 3
	break
    case 3:
	answer = scheduler.wait()
	answer.send('human', 'time to carry the water')
	this.state = 4
	break
    case 4:
	// assume the message is correct for now
	answer = scheduler.sleep('1 day')
	answer.release('human')
	this.state = 0
	break;
    }
    return answer
}

// a simple print-based scheduler loop
var chores = new Chores()
var scheduler = new RecordScheduler()
for (var i = 0; i < 20; ++i) {
    var command = chores.step(scheduler)
    print(command)
}
