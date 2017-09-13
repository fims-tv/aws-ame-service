//"use strict";
console.log('Loading function');

var FIMS = require("fims-aws");

var childProcess = require("child_process");
var fs = require("fs")
var path = require("path");

var async = require("async");
var uuid = require("uuid");

process.env["PATH"] = process.env["PATH"] + ":" + process.env["LAMBDA_TASK_ROOT"] + "/bin";

var s3;

exports.handler = (input, context, callback) => {
    var event = input.event;
    var jobAssignment = input.jobAssignment;

    console.log("Received event:", JSON.stringify(event, null, 2));
    console.log("Received jobAssignment:", JSON.stringify(jobAssignment, null, 2));

    doProcessJob(event, jobAssignment, callback);
};

function doProcessJob(event, jobAssignment, callback) {
    if (!s3) {
        s3 = new FIMS.AWS.S3();
    }

    var jobProcess;
    var job;
    var jobProfile
    var jobInput;;
    var bmEssence;
    var inputFilename;
    var ffmpegOutput;
    var report;
    var tempFilename;
    var outputFilename;

    async.waterfall([
        function (callback) {
            console.log("updating jobAssignment status to RUNNING");
            jobAssignment.jobProcessStatus = "RUNNING";
            jobAssignment.dateModified = new Date().toISOString();
            FIMS.DAL.put(event, jobAssignment.id, jobAssignment, callback);
        },
        function (updatedJobAssignment, callback) {
            console.log("Resolving jobAssignment.jobProcess");
            FIMS.DAL.get(event, jobAssignment.jobProcess, callback);
        },
        function (resource, callback) {
            if (!resource) {
                return callback("Failed to resolve jobAssignment.jobProcess");
            } else if (resource.type !== "JobProcess") {
                return callback("jobAssignment.jobProcess has unexpected type '" + resource.type + "'");
            }

            console.log(JSON.stringify(resource, null, 2));
            jobProcess = resource;

            console.log("Resolving jobProcess.job");
            FIMS.DAL.get(event, jobProcess.job, callback);
        },
        function (resource, callback) {
            if (!resource) {
                return callback("Failed to resolve jobProcess.job");
            } else if (resource.type !== "TransformJob") {
                return callback("jobProcess.job has unexpected type '" + resource.type + "'");
            }

            console.log(JSON.stringify(resource, null, 2));
            job = resource;

            console.log("Resolving job.jobProfile");
            FIMS.DAL.get(event, job.jobProfile, callback);
        },
        function (resource, callback) {
            if (!resource) {
                return callback("Failed to resolve job.jobProfile");
            } else if (resource.type !== "JobProfile") {
                return callback("job.jobProfile has unexpected type '" + resource.type + "'");
            }

            console.log(JSON.stringify(resource, null, 2));
            jobProfile = resource;

            if (jobProfile.label !== "ExtractThumbnail" &&
                jobProfile.label !== "CreateProxy") {
                return callback("JobProfile '" + jobProfile.label + "' not accepted");
            }

            console.log("Resolving job.jobInput");
            FIMS.DAL.get(event, job.jobInput, callback);
        },
        function (resource, callback) {
            if (!resource) {
                return callback("Failed to resolve job.jobInput");
            } else if (resource.type !== "JobParameterBag") {
                return callback("job.jobInput has unexpected type '" + resource.type + "'");
            }

            console.log(JSON.stringify(resource, null, 2));
            jobInput = resource;

            console.log("Resolving jobInput[\"ebucore:hasRelatedResource\"]");
            FIMS.DAL.get(event, jobInput["ebucore:hasRelatedResource"], callback);
        },
        function (resource, callback) {
            if (!resource) {
                return callback("Failed to resolve jobInput[\"ebucore:hasRelatedResource\"]");
            } else if (resource.type !== "BMEssence") {
                return callback("jobInput[\"ebucore:hasRelatedResource\"] has unexpected type '" + resource.type + "'");
            } else if (!resource["ebucore:locator"]) {
                return callback("jobInput[\"ebucore:hasRelatedResource\"] does not have property 'ebucore:locator'");
            }


            console.log(JSON.stringify(resource, null, 2));
            bmEssence = resource;

            var locator = bmEssence["ebucore:locator"];

            var bucket = locator.substring(locator.indexOf("/", 8) + 1);
            var key = bucket.substring(bucket.indexOf("/") + 1);
            bucket = bucket.substring(0, bucket.indexOf("/"));

            inputFilename = "/tmp/" + key;

            console.log("Retrieving file from bucket '" + bucket + "' with key '" + key + "'");
            var params = {
                Bucket: bucket,
                Key: key
            };

            return s3.getObject(params, callback)
        },
        function (data, callback) {
            console.log("Writing file to '" + inputFilename + "'");
            return fs.writeFile(inputFilename, data.Body, callback);
        },
        function (callback) {
            // Set the path to the mediainfo binary
            var exe = path.join(__dirname, 'bin/ffmpeg');

            var args;

            // Defining the arguments
            switch (jobProfile.label) {
                case "ExtractThumbnail":
                    tempFilename = "/tmp/" + uuid.v4() + ".png";
                    args = ["-i", inputFilename, "-ss", "00:00:07", "-vframes", "1", tempFilename];
                    break;
                case "CreateProxy":
                    tempFilename = "/tmp/" + uuid.v4() + ".mp4";
                    args = ["-y", "-i", inputFilename, "-preset", "ultrafast", "-vf", "scale=-1:360", "-c:v", "libx264", "-pix_fmt", "yuv420p", tempFilename];
                    break;
                default:
                    return callback("Unknown jobProfile '" + jobProfile.label + "'");
            }

            // Launch the child process
            childProcess.execFile(exe, args, function (error, stdout, stderr) {
                if (!error) {
                    if (stderr) {
                        console.error(stderr);
                    }
                    if (stdout) {
                        console.log(stdout);
                    }
                }
                return callback(error);
            });
        },
        function (callback) {
            console.log("Deleting file '" + inputFilename + "'");
            return fs.unlink(inputFilename, callback);
        },
        function (callback) {

            if (!job.outputLocation) {
                return callback("OutputLocation missing");
            }

            switch (jobProfile.label) {
                case "ExtractThumbnail":
                    outputFilename = job.outputLocation + "/" + uuid.v4() + ".png";
                    break;
                case "CreateProxy":
                    outputFilename = job.outputLocation + "/" + uuid.v4() + ".mp4";
                    break;
                default:
                    return callback("Unknown jobProfile '" + jobProfile.label + "'");
            }

            var bucket = outputFilename.substring(outputFilename.indexOf("/", 8) + 1);
            var key = bucket.substring(bucket.indexOf("/") + 1);
            bucket = bucket.substring(0, bucket.indexOf("/"));

            console.log("Storing file in bucket '" + bucket + "' with key '" + key + "'");
            var params = {
                Bucket: bucket,
                Key: key,
                Body: fs.readFileSync(tempFilename)
            };
            return s3.putObject(params, callback)
        },
        function (data, callback) {
            console.log("Successfully stored file");
            return callback();
        }
    ], function (processError) {
        if (processError) {
            console.error(processError);
        }

        if (processError) {
            jobAssignment.jobProcessStatus = "FAILED";
            jobAssignment.jobProcessStatusReason = processError;
        } else {
            jobAssignment.jobProcessStatus = "COMPLETED";
            jobAssignment.jobOutput = new FIMS.CORE.JobParameterBag({ "ebucore:locator": outputFilename });
        }

        jobAssignment.dateModified = new Date().toISOString();

        console.log("updating jobAssignment");
        return FIMS.DAL.put(event, jobAssignment.id, jobAssignment, (err) => {
            if (err) {
                console.log("Failed to update jobAssignment due to: " + err);
                jobAssignment.jobProcessStatus = "FAILED";
            }

            if (jobProcess) {
                jobProcess.jobProcessStatus = jobAssignment.jobProcessStatus;

                console.log("Updating jobProcess");
                return FIMS.DAL.put(event, jobProcess.id, jobProcess, (err) => {
                    if (err) {
                        console.log("Failed to update jobProcess");
                    }
                    return callback();
                });
            }
            return callback();
        });
    });
}

