test: test_richards test_barbershop

test_richards: task_7.js richards.js run_richards_on_task.js
	js task_7.js richards.js run_richards_on_task.js

test_barbershop: task_6.js barbershop.js run_barbershop_on_task.js
	js task_6.js barbershop.js run_barbershop_on_task.js
