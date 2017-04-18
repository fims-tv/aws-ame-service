//'use strict';
var async = require("async");
var request = require("request");
var xml2js = require("xml2js");

var configuration = require("./configuration.js");

var constants = require("./lambda-constants.js");
var worker = require("./lambda-worker.js");

var inputContext = constants.CONTEXTS[constants.DEFAULT_CONTEXT];

function testReport(response, body, message, expectedStatusCode, callback) {
    var error;

    var headerMissingMessage = (expectedStatusCode === 201 && !response.headers.location) ? " - Missing header 'Location'" : "";
    var statusCodeMessage = response.statusCode !== expectedStatusCode ? "Status Code: " + response.statusCode + " (Expected: " + expectedStatusCode + ")" : expectedStatusCode;
    var status = response.statusCode !== expectedStatusCode || headerMissingMessage ? "ERROR" : "OK   ";
    console.log(status + " - " + message + " - " + statusCodeMessage + headerMissingMessage);

    if (body && verbose) {
        console.log(JSON.stringify(body, null, 2));
        console.log();
    }

    if (response.statusCode !== expectedStatusCode || headerMissingMessage) {
        error = "Test Failed";
    }

    callback(error);
}

var all = {
    xmlparse: function (callback) {
        var xml =
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<!-- Generated by MediaInfoLib - v0.7.93 -->\n" +
            "<ebucore:ebuCoreMain xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:ebucore=\"urn:ebu:metadata-schema:ebuCore_2015\"\n" +
            "xmlns:xalan=\"http://xml.apache.org/xalan\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\n" +
            "xsi:schemaLocation=\"urn:ebu:metadata-schema:ebuCore_2015 https://www.ebu.ch/metadata/schemas/EBUCore/20150522/ebucore_20150522.xsd\" version=\"1.6\" dateLastModified=\"2017-03-30\" timeLastModified=\"08:53:32Z\">\n" +
            "<ebucore:coreMetadata>\n" +
            "<ebucore:format>\n" +
            "<ebucore:videoFormat videoFormatName=\"AVC\">\n" +
            "<ebucore:width unit=\"pixel\">1280</ebucore:width>\n" +
            "<ebucore:height unit=\"pixel\">720</ebucore:height>\n" +
            "<ebucore:frameRate factorNumerator=\"25000\" factorDenominator=\"1000\">25</ebucore:frameRate>\n" +
            "<ebucore:aspectRatio typeLabel=\"display\">\n" +
            "<ebucore:factorNumerator>16</ebucore:factorNumerator>\n" +
            "<ebucore:factorDenominator>9</ebucore:factorDenominator>\n" +
            "</ebucore:aspectRatio>\n" +
            "<ebucore:videoEncoding typeLabel=\"High@L3.1\"/>\n" +
            "<ebucore:codec>\n" +
            "<ebucore:codecIdentifier>\n" +
            "<dc:identifier>avc1</dc:identifier>\n" +
            "</ebucore:codecIdentifier>\n" +
            "</ebucore:codec>\n" +
            "<ebucore:bitRate>4999936</ebucore:bitRate>\n" +
            "<ebucore:bitRateMode>variable</ebucore:bitRateMode>\n" +
            "<ebucore:scanningFormat>progressive</ebucore:scanningFormat>\n" +
            "<ebucore:videoTrack trackId=\"1\"/>\n" +
            "<ebucore:technicalAttributeString typeLabel=\"Standard\">PAL</ebucore:technicalAttributeString>\n" +
            "<ebucore:technicalAttributeString typeLabel=\"ColorSpace\">YUV</ebucore:technicalAttributeString>\n" +
            "<ebucore:technicalAttributeString typeLabel=\"ChromaSubsampling\">4:2:0</ebucore:technicalAttributeString>\n" +
            "<ebucore:technicalAttributeString typeLabel=\"colour_primaries\">BT.709</ebucore:technicalAttributeString>\n" +
            "<ebucore:technicalAttributeString typeLabel=\"transfer_characteristics\">BT.709</ebucore:technicalAttributeString>\n" +
            "<ebucore:technicalAttributeString typeLabel=\"matrix_coefficients\">BT.709</ebucore:technicalAttributeString>\n" +
            "<ebucore:technicalAttributeString typeLabel=\"colour_range\">Limited</ebucore:technicalAttributeString>\n" +
            "<ebucore:technicalAttributeInteger typeLabel=\"StreamSize\" unit=\"byte\">13161765</ebucore:technicalAttributeInteger>\n" +
            "<ebucore:technicalAttributeInteger typeLabel=\"BitDepth\" unit=\"bit\">8</ebucore:technicalAttributeInteger>\n" +
            "<ebucore:technicalAttributeBoolean typeLabel=\"CABAC\">true</ebucore:technicalAttributeBoolean>\n" +
            "<ebucore:technicalAttributeBoolean typeLabel=\"MBAFF\">false</ebucore:technicalAttributeBoolean>\n" +
            "</ebucore:videoFormat>\n" +
            "<ebucore:audioFormat audioFormatName=\"AAC\">\n" +
            "<ebucore:audioEncoding typeLabel=\"LC\"/>\n" +
            "<ebucore:codec>\n" +
            "<ebucore:codecIdentifier>\n" +
            "<dc:identifier>40</dc:identifier>\n" +
            "</ebucore:codecIdentifier>\n" +
            "</ebucore:codec>\n" +
            "<ebucore:samplingRate>48000</ebucore:samplingRate>\n" +
            "<ebucore:bitRate>317375</ebucore:bitRate>\n" +
            "<ebucore:bitRateMax>353625</ebucore:bitRateMax>\n" +
            "<ebucore:bitRateMode>variable</ebucore:bitRateMode>\n" +
            "<ebucore:audioTrack trackId=\"2\" trackLanguage=\"en\"/>\n" +
            "<ebucore:channels>2</ebucore:channels>\n" +
            "<ebucore:technicalAttributeString typeLabel=\"ChannelPositions\">Front: L R</ebucore:technicalAttributeString>\n" +
            "<ebucore:technicalAttributeString typeLabel=\"ChannelLayout\">L R</ebucore:technicalAttributeString>\n" +
            "<ebucore:technicalAttributeInteger typeLabel=\"StreamSize\" unit=\"byte\">832792</ebucore:technicalAttributeInteger>\n" +
            "</ebucore:audioFormat>\n" +
            "<ebucore:containerFormat containerFormatName=\"MPEG-4\">\n" +
            "<ebucore:containerEncoding formatLabel=\"MPEG-4\"/>\n" +
            "<ebucore:codec>\n" +
            "<ebucore:codecIdentifier>\n" +
            "<dc:identifier>mp42</dc:identifier>\n" +
            "</ebucore:codecIdentifier>\n" +
            "</ebucore:codec>\n" +
            "<ebucore:technicalAttributeString typeLabel=\"FormatProfile\">Base Media / Version 2</ebucore:technicalAttributeString>\n" +
            "<ebucore:technicalAttributeString typeLabel=\"FormatSettings\"></ebucore:technicalAttributeString>\n" +
            "</ebucore:containerFormat>\n" +
            "<ebucore:duration>\n" +
            "<ebucore:normalPlayTime>PT21.000S</ebucore:normalPlayTime>\n" +
            "</ebucore:duration>\n" +
            "<ebucore:fileSize>14012779</ebucore:fileSize>\n" +
            "<ebucore:fileName>2015_GF_ORF_00_00_00_conv.mp4</ebucore:fileName>\n" +
            "<ebucore:locator>/tmp/2015_GF_ORF_00_00_00_conv.mp4</ebucore:locator>\n" +
            "<ebucore:technicalAttributeInteger typeLabel=\"OverallBitRate\" unit=\"bps\">5338202</ebucore:technicalAttributeInteger>\n" +
            "<ebucore:dateCreated startDate=\"2017-02-06\" startTime=\"11:18:33Z\"/>\n" +
            "<ebucore:dateModified startDate=\"2017-02-06\" startTime=\"11:18:33Z\"/>\n" +
            "</ebucore:format>\n" +
            "</ebucore:coreMetadata>\n" +
            "</ebucore:ebuCoreMain>";

        var xsl = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<xsl:stylesheet xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\"\n" +
            "    version=\"1.0\"\n" +
            "    xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\" \n" +
            "    xmlns:rdfs=\"http://www.w3.org/2000/01/rdf-schema#\"\n" +
            "    xmlns:fims=\"http://fims.tv#\"\n" +
            "    xmlns:dc=\"http://purl.org/dc/elements/1.1/\"\n" +
            "    xmlns:ebucore=\"urn:ebu:metadata-schema:ebuCore_2015\"\n" +
            "    xmlns:ebucorerdf=\"http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#\"\n" +
            "    xmlns:esc=\"http://www.eurovision.com#\" \n" +
            "    xmlns:esc2015_p=\"http://www.eurovision.com/2015/performer#\"  \n" +
            "    xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">\n" +
            "    \n" +
            "    <xsl:output method=\"xml\" encoding=\"UTF-8\" indent=\"yes\" omit-xml-declaration=\"yes\"/>\n" +
            "\n" +
            "    <xsl:namespace-alias stylesheet-prefix=\"ebucore\" result-prefix=\"ebucorerdf\"/>\n" +
            "\n" +
            "    <xsl:template match=\"@*\">\n" +
            "        <xsl:copy/>\n" +
            "    </xsl:template>\n" +
            "    \n" +
            "    <xsl:template match=\"text() | comment()\">\n" +
            "        <xsl:copy/>\n" +
            "    </xsl:template>\n" +
            "    \n" +
            "    \n" +
            "    <xsl:template match=\"*\">\n" +
            "        <xsl:element name=\"{name()}\">\n" +
            "            <xsl:apply-templates select=\"* | text() | @* | comment()\"/>\n" +
            "            <xsl:apply-templates select=\"@* | node()\"/>\n" +
            "        </xsl:element>\n" +
            "    </xsl:template>\n" +
            "    \n" +
            "    <xsl:template match=\"/\">\n" +
            "\n" +
            "        \n" +
            "        <rdf:RDF\n" +
            "            xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\" \n" +
            "            xmlns:rdfs=\"http://www.w3.org/2000/01/rdf-schema#\"\n" +
            "            xmlns:mediaInfo=\"https://mediaarea.net\"\n" +
            "            xmlns:fims=\"http://fims.tv#\"\n" +
            "            xmlns:dc=\"http://purl.org/dc/elements/1.1/\"\n" +
            "            xmlns:esc=\"http://www.eurovision.com#\" \n" +
            "            xmlns:esc2015_p=\"http://www.eurovision.com/2015/performer#\"  \n" +
            "            xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\n" +
            "            xmlns:ebucore=\"urn:ebu:metadata-schema:ebuCore_2015\"\n" +
            "            xmlns:ebucorerdf=\"http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#\">\n" +
            "            <xsl:for-each select=\"ebucore:ebuCoreMain/ebucore:coreMetadata/ebucore:format\">\n" +
            "                <ebucore:BMEssence rdf:about=\"{concat('http://repository-server/BMEssence/2083_',substring-before(substring-after(ebucore:fileName,'ORF_'),'_conv')) }\">		\n" +
            "                    <ebucore:hasVideoFormat><xsl:value-of select=\"ebucore:videoFormat/@videoFormatName\"/></ebucore:hasVideoFormat>	\n" +
            "                <ebucore:frameWidth><xsl:value-of select=\"ebucore:videoFormat/ebucore:width\"/></ebucore:frameWidth>	\n" +
            "                <ebucore:frameHeight><xsl:value-of select=\"ebucore:videoFormat/ebucore:height\"/></ebucore:frameHeight>	\n" +
            "                <ebucore:frameRate><xsl:value-of select=\"ebucore:videoFormat/ebucore:frameRate\"/>*<xsl:value-of select=\"ebucore:videoFormat/ebucore:frameRate/@factorNumerator\"/>/<xsl:value-of select=\"ebucore:videoFormat/ebucore:frameRate/@factorDenominator\"/></ebucore:frameRate>	\n" +
            "                <ebucore:displayAspectRatio><xsl:value-of select=\"ebucore:videoFormat/ebucore:aspectRatio[@typeLabel='display']/ebucore:factorNumerator\"/>:<xsl:value-of select=\"ebucore:videoFormat/ebucore:aspectRatio[@typeLabel='display']/ebucore:factorDenominator\"/></ebucore:displayAspectRatio>	\n" +
            "                <ebucore:hasVideoEncodingFormat><xsl:value-of select=\"ebucore:videoFormat/ebucore:videoEncoding/@typeLabel\"/></ebucore:hasVideoEncodingFormat>	\n" +
            "                <ebucore:hasVideoCodec><xsl:value-of select=\"ebucore:videoFormat/ebucore:codec/ebucore:codecIdentifier/dc:identifier\"/></ebucore:hasVideoCodec>	\n" +
            "                <ebucore:videoBitRate><xsl:value-of select=\"ebucore:videoFormat/ebucore:bitRate\"/></ebucore:videoBitRate>	\n" +
            "                <ebucore:videoBitRateMax><xsl:value-of select=\"ebucore:videoFormat/ebucore:bitRateMax\"/></ebucore:videoBitRateMax>	\n" +
            "                <ebucore:videoBitRateMode><xsl:value-of select=\"ebucore:videoFormat/ebucore:bitRateMode\"/></ebucore:videoBitRateMode>	\n" +
            "                <ebucore:scanningFormat><xsl:value-of select=\"ebucore:videoFormat/ebucore:scanningFormat\"/></ebucore:scanningFormat>	\n" +
            "                <ebucore:hasVideoTrack>	\n" +
            "                    <ebucore:VideoTrack>\n" +
            "                        <ebucore:trackNumber><xsl:value-of select=\"ebucore:videoFormat/ebucore:videoTrack/@trackId\"/></ebucore:trackNumber>                    \n" +
            "                    </ebucore:VideoTrack>\n" +
            "                </ebucore:hasVideoTrack> 	\n" +
            "                <mediaInfo:Standard><xsl:value-of select=\"ebucore:videoFormat/ebucore:technicalAttributeString[@typeLabel='Standard']\"/></mediaInfo:Standard>	\n" +
            "                <mediaInfo:ColorSpace><xsl:value-of select=\"ebucore:videoFormat/ebucore:technicalAttributeString[@typeLabel='ColorSpace']\"/></mediaInfo:ColorSpace>	\n" +
            "                <mediaInfo:ChromaSubSampling><xsl:value-of select=\"ebucore:videoFormat/ebucore:technicalAttributeString[@typeLabel='ChromaSubsampling']\"/></mediaInfo:ChromaSubSampling>	\n" +
            "                <mediaInfo:colour_primaries><xsl:value-of select=\"ebucore:videoFormat/ebucore:technicalAttributeString[@typeLabel='colour_primaries']\"/></mediaInfo:colour_primaries>	\n" +
            "                <mediaInfo:transfer_characteristics><xsl:value-of select=\"ebucore:videoFormat/ebucore:technicalAttributeString[@typeLabel='transfer_characteristics']\"/></mediaInfo:transfer_characteristics>	\n" +
            "                <mediaInfo:matrix_coefficients><xsl:value-of select=\"ebucore:videoFormat/ebucore:technicalAttributeString[@typeLabel='matrix_coefficients']\"/></mediaInfo:matrix_coefficients>	\n" +
            "                <mediaInfo:colour_range><xsl:value-of select=\"ebucore:videoFormat/ebucore:technicalAttributeString[@typeLabel='colour_range']\"/></mediaInfo:colour_range>	\n" +
            "                <mediaInfo:VideoStreamSize><xsl:value-of select=\"ebucore:videoFormat/ebucore:technicalAttributeInteger[@typeLabel='StreamSize']\"/></mediaInfo:VideoStreamSize>	\n" +
            "                <mediaInfo:BitDepth><xsl:value-of select=\"ebucore:videoFormat/ebucore:technicalAttributeInteger[@typeLabel='BitDepth']\"/></mediaInfo:BitDepth>	\n" +
            "                <mediaInfo:CABAC><xsl:value-of select=\"ebucore:videoFormat/ebucore:technicalAttributeBoolean[@typeLabel='CABAC']\"/></mediaInfo:CABAC>	\n" +
            "                <mediaInfo:MBAFF><xsl:value-of select=\"ebucore:videoFormat/ebucore:technicalAttributeBoolean[@typeLabel='MBAFF']\"/></mediaInfo:MBAFF>	\n" +
            "                <ebucore:hasAudioFormat><xsl:value-of select=\"ebucore:audioFormat/@audioFormatName\"/></ebucore:hasAudioFormat>	\n" +
            "                <ebucore:hasAudioEncodingFormat><xsl:value-of select=\"ebucore:audioFormat/ebucore:audioEncoding/@typeLabel\"/></ebucore:hasAudioEncodingFormat>	\n" +
            "                <ebucore:hasAudioCodec><xsl:value-of select=\"ebucore:audioFormat/ebucore:codec/ebucore:codecIdentifier/dc:identifier\"/></ebucore:hasAudioCodec>	\n" +
            "                <ebucore:sampleRate><xsl:value-of select=\"ebucore:audioFormat/ebucore:samplingRate\"/></ebucore:sampleRate>	\n" +
            "                <ebucore:audioBitRate><xsl:value-of select=\"ebucore:audioFormat/ebucore:bitRate\"/></ebucore:audioBitRate>	\n" +
            "                <ebucore:audioBitRateMax><xsl:value-of select=\"ebucore:audioFormat/ebucore:bitRateMax\"/></ebucore:audioBitRateMax>	\n" +
            "                <ebucore:audioBitRateMode><xsl:value-of select=\"ebucore:audioFormat/ebucore:bitRateMode\"/></ebucore:audioBitRateMode>	\n" +
            "                <ebucore:hasAudioTrack>\n" +
            "                    <ebucore:AudioTrack>\n" +
            "                        <ebucore:trackId><xsl:value-of select=\"ebucore:audioFormat/ebucore:audioTrack/@trackId\"/></ebucore:trackId>\n" +
            "                        <ebucore:hasLanguage><xsl:value-of select=\"ebucore:audioFormat/ebucore:audioTrack/@trackLanguage\"/></ebucore:hasLanguage>\n" +
            "                    </ebucore:AudioTrack>\n" +
            "                </ebucore:hasAudioTrack> 	\n" +
            "                <ebucore:audioChannelNumber><xsl:value-of select=\"ebucore:audioFormat/ebucore:channels\"/></ebucore:audioChannelNumber>	\n" +
            "                <mediaInfo:ChannelPositions><xsl:value-of select=\"ebucore:audioFormat/ebucore:technicalAttributeString[@typeLabel='ChannelPositions']\"/></mediaInfo:ChannelPositions>	\n" +
            "                <mediaInfo:ChannelLayout><xsl:value-of select=\"ebucore:audioFormat/ebucore:technicalAttributeString[@typeLabel='ChannelLayout']\"/></mediaInfo:ChannelLayout>	\n" +
            "                <mediaInfo:AudioStreamSize><xsl:value-of select=\"ebucore:audioFormat/ebucore:technicalAttributeInteger[@typeLabel='StreamSize']\"/></mediaInfo:AudioStreamSize>	\n" +
            "                <ebucore:hasContainerFormat><xsl:value-of select=\"ebucore:containerFormat/@containerFormatName\"/></ebucore:hasContainerFormat>	\n" +
            "                <ebucore:hasContainerEncodingFormat><xsl:value-of select=\"ebucore:containerFormat/ebucore:technicalAttributeString[@typeLabel='FormatProfile']/.\"/></ebucore:hasContainerEncodingFormat>	\n" +
            "                <ebucore:hasContainerCodec><xsl:value-of select=\"ebucore:containerFormat/ebucore:codec/ebucore:codecIdentifier/dc:identifier\"/></ebucore:hasContainerCodec>	\n" +
            "                <ebucore:durationNormalPlayTime><xsl:value-of select=\"ebucore:duration/ebucore:normalPlayTime\"/></ebucore:durationNormalPlayTime>\n" +
            "                <ebucore:fileSize><xsl:value-of select=\"ebucore:fileSize\"/></ebucore:fileSize>	\n" +
            "                <ebucore:filename><xsl:value-of select=\"ebucore:fileName\"/></ebucore:filename>\n" +
            "                <!--ebucore:locator><xsl:value-of select=\"ebucore:locator\"/></ebucore:locator-->	\n" +
            "                <ebucore:bitRateOverall><xsl:value-of select=\"ebucore:technicalAttributeInteger[@typeLabel='OverallBitRate']/.\"/></ebucore:bitRateOverall>	\n" +
            "                <ebucore:dateCreated><xsl:value-of select=\"ebucore:dateCreated/@startDate\"/></ebucore:dateCreated>	\n" +
            "                <ebucore:dateModified><xsl:value-of select=\"ebucore:dateModified/@startDate\"/></ebucore:dateModified>\n" +
            "                </ebucore:BMEssence>\n" +
            "            </xsl:for-each>\n" +
            "        </rdf:RDF>\n" +
            "    </xsl:template>\n" +
            "</xsl:stylesheet>";

        xml2js.parseString(xml, {
            explicitArray: true,
            async: true
        }, function (err, result) {
            if (!err) {
                console.log(JSON.stringify(result, null, 2));
                var output = worker.generateOutput(result);

                console.log(JSON.stringify(output, null, 2));
            }

            callback(err);
        });
    },
}

function extractMetadata(obj, path, defaultValue) {
    var parts = path.split("/");
    for (var i = 0; i < parts.length; i++) {
        // console.log("-----------------------------");
        // console.log(obj)

        obj = obj[parts[i]];
        if (obj === undefined) {
            return defaultValue;
        }
    }
    return obj;
}

//////////////////////////////
//         TestSuite        //
//////////////////////////////
console.log("Starting");

var deployConfig = configuration.deployConfig();
var testConfig = configuration.testConfig();

var command = "";
if (process.argv.length > 2) {
    command = process.argv[2];
}
var target = testConfig.default;
if (process.argv.length > 3 && testConfig[process.argv[3]]) {
    target = process.argv[3];
}

var baseUrl = testConfig[target].endpoint;

var verbose = process.argv.indexOf("verbose") >= 2;

var functions = [];

if (command === "all") {
    for (var testName in all) {
        functions.push(all[testName]);
    }
} else if (all[command]) {
    functions.push(all[command]);
} else {
    functions.push(function (callback) {
        callback("Cannot find test: " + command);
    })
}

async.waterfall(functions, function (err) {
    if (err) {
        console.log();
        console.log("ERROR:");
        console.error(err);
    }
    console.log();
    console.log("Done!");
});