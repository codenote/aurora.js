(function() {
  var Bitstream, Buffer, BufferList, CAFDemuxer, Float32, Float64, FormatIDtoAuroraID, FromFloat32, FromFloat64, HTTPSource, LPCMDecoder, Queue, Stream, ToFloat32, ToFloat64;

  Bitstream = (function() {

    function Bitstream(stream) {
      this.stream = stream;
      this.bitPosition = 0;
    }

    Bitstream.prototype.copy = function() {
      var result;
      result = new Bitstream(this.stream.copy());
      result.bitPosition = this.bitPosition;
      return result;
    };

    Bitstream.prototype.offset = function() {
      return 8 * this.stream.offset + this.bitPosition;
    };

    Bitstream.prototype.available = function(bits) {
      return this.stream.available((bits + 8 - this.bitPosition) / 8);
    };

    Bitstream.prototype.advance = function(bits) {
      this.bitPosition += bits;
      this.stream.advance(this.bitPosition >> 3);
      this.bitPosition = this.bitPosition & 7;
      return this;
    };

    Bitstream.prototype.align = function() {
      if (this.bitPosition !== 0) {
        this.bitPosition = 0;
        this.stream.advance(1);
      }
      return this;
    };

    Bitstream.prototype.readBig = function(bits) {
      var a, a0, a1, a2, a3, a4;
      a0 = this.stream.peekUInt8(0) * 0x0100000000;
      a1 = this.stream.peekUInt8(1) * 0x0001000000;
      a2 = this.stream.peekUInt8(2) * 0x0000010000;
      a3 = this.stream.peekUInt8(3) * 0x0000000100;
      a4 = this.stream.peekUInt8(4) * 0x0000000001;
      a = a0 + a1 + a2 + a3 + a4;
      a = a % Math.pow(2, 40 - this.bitPosition);
      a = a / Math.pow(2, 40 - this.bitPosition - bits);
      this.advance(bits);
      return a << 0;
    };

    Bitstream.prototype.peekBig = function(bits) {
      var a, a0, a1, a2, a3, a4;
      a0 = this.stream.peekUInt8(0) * 0x0100000000;
      a1 = this.stream.peekUInt8(1) * 0x0001000000;
      a2 = this.stream.peekUInt8(2) * 0x0000010000;
      a3 = this.stream.peekUInt8(3) * 0x0000000100;
      a4 = this.stream.peekUInt8(4) * 0x0000000001;
      a = a0 + a1 + a2 + a3 + a4;
      a = a % Math.pow(2, 40 - this.bitPosition);
      a = a / Math.pow(2, 40 - this.bitPosition - bits);
      return a << 0;
    };

    Bitstream.prototype.peekSafeBig = function(bits) {
      var a, a0, a1, a2, a3, a4;
      a0 = this.stream.peekSafeUInt8(0) * 0x0100000000;
      a1 = this.stream.peekSafeUInt8(1) * 0x0001000000;
      a2 = this.stream.peekSafeUInt8(2) * 0x0000010000;
      a3 = this.stream.peekSafeUInt8(3) * 0x0000000100;
      a4 = this.stream.peekSafeUInt8(4) * 0x0000000001;
      a = a0 + a1 + a2 + a3 + a4;
      a = a % Math.pow(2, 40 - this.bitPosition);
      a = a / Math.pow(2, 40 - this.bitPosition - bits);
      return a << 0;
    };

    Bitstream.prototype.read = function(bits) {
      var a;
      a = this.stream.peekUInt32(0);
      a = (a << this.bitPosition) >>> (32 - bits);
      this.advance(bits);
      return a;
    };

    Bitstream.prototype.peek = function(bits) {
      var a;
      a = this.stream.peekUInt32(0);
      a = (a << this.bitPosition) >>> (32 - bits);
      return a;
    };

    Bitstream.prototype.peekSafe = function(bits) {
      var a, a0, a1, a2, a3;
      a0 = this.stream.peekSafeUInt8(0) * 0x01000000;
      a1 = this.stream.peekSafeUInt8(1) * 0x00010000;
      a2 = this.stream.peekSafeUInt8(2) * 0x00000100;
      a3 = this.stream.peekSafeUInt8(3) * 0x00000001;
      a = a0 + a1 + a2 + a3;
      a = (a << this.bitPosition) >>> (32 - bits);
      return a;
    };

    Bitstream.prototype.readSmall = function(bits) {
      var a;
      a = this.stream.peekUInt16(0);
      a = ((a << this.bitPosition) & 0xFFFF) >>> (16 - bits);
      this.advance(bits);
      return a;
    };

    Bitstream.prototype.peekSmall = function(bits) {
      var a;
      a = this.stream.peekUInt16(0);
      a = ((a << this.bitPosition) & 0xFFFF) >>> (16 - bits);
      return a;
    };

    Bitstream.prototype.peekSafe = function(bits) {
      var a, a0, a1;
      a0 = this.stream.peekSafeUInt8(0) * 0x0100;
      a1 = this.stream.peekSafeUInt8(1) * 0x0001;
      a = a0 + a1;
      a = ((a << this.bitPosition) & 0xFFFF) >>> (16 - bits);
      return a;
    };

    return Bitstream;

  })();

  if (!window.Aurora) window.Aurora = {};

  window.Aurora.Bitstream = Bitstream;

  BufferList = (function() {

    function BufferList() {
      this.buffers = [];
      this.availableBytes = 0;
      this.availableBuffers = 0;
      this.bufferHighWaterMark = null;
      this.bufferLowWaterMark = null;
      this.bytesHighWaterMark = null;
      this.bytesLowWaterMark = null;
      this.onLowWaterMarkReached = null;
      this.onHighWaterMarkReached = null;
      this.onLevelChange = null;
      this.endOfList = false;
      this.first = null;
    }

    BufferList.prototype.copy = function() {
      var result;
      result = new BufferList();
      result.buffers = this.buffers.slice(0);
      result.availableBytes = this.availableBytes;
      result.availableBuffers = this.availableBuffers;
      return result.endOfList = this.endOfList;
    };

    BufferList.prototype.shift = function() {
      var result;
      result = this.buffers.shift();
      this.availableBytes -= result.length;
      this.availableBuffers -= 1;
      this.first = this.buffers[0];
      return result;
    };

    BufferList.prototype.push = function(buffer) {
      this.buffers.push(buffer);
      this.availableBytes += buffer.length;
      this.availableBuffers += 1;
      if (!this.first) this.first = buffer;
      return this;
    };

    BufferList.prototype.unshift = function(buffer) {
      this.buffers.unshift(buffer);
      this.availableBytes += buffer.length;
      this.availableBuffers += 1;
      this.first = buffer;
      return this;
    };

    return BufferList;

  })();

  if (!window.Aurora) window.Aurora = {};

  window.Aurora.BufferList = BufferList;

  Buffer = (function() {

    function Buffer(data) {
      this.data = data;
      this.position = null;
      this.length = this.data.length;
      this.timestamp = null;
      this.duration = null;
      this.metadata = null;
      this.final = false;
      this.discontinuity = false;
    }

    Buffer.allocate = function(size) {
      return new Buffer(new Uint8Array(size));
    };

    Buffer.prototype.copy = function() {
      var buffer;
      buffer = new Buffer(new Uint8Array(this.data));
      buffer.position = this.position;
      buffer.timestamp = this.timestamp;
      buffer.duration = this.duration;
      buffer.metadata = this.metadata;
      buffer.final = this.final;
      return buffer.discontinuity = this.discontinuity;
    };

    Buffer.prototype.slice = function(position, length) {
      var result;
      if (position === 0 && length >= this.length) {
        return this;
      } else {
        result = new Buffer(this.data.subarray(position, length));
        result.position = this.position + position;
        return result;
      }
    };

    return Buffer;

  })();

  if (!window.Aurora) window.Aurora = {};

  window.Aurora.Buffer = Buffer;

  Float64 = new ArrayBuffer(8);

  Float32 = new ArrayBuffer(4);

  FromFloat64 = new Float64Array(Float64);

  FromFloat32 = new Float32Array(Float32);

  ToFloat64 = new Uint32Array(Float64);

  ToFloat32 = new Uint32Array(Float32);

  Stream = (function() {

    function Stream(list) {
      this.list = list;
      this.localOffset = 0;
      this.offset = 0;
    }

    Stream.prototype.copy = function() {
      var result;
      result = new Stream(this.list.copy);
      result.localOffset = this.localOffset;
      result.offset = this.offset;
      return result;
    };

    Stream.prototype.available = function(bytes) {
      return this.list.availableBytes - this.localOffset >= bytes;
    };

    Stream.prototype.advance = function(bytes) {
      this.localOffset += bytes;
      this.offset += bytes;
      while (this.list.first && (this.localOffset >= this.list.first.length)) {
        this.localOffset -= this.list.shift().length;
      }
      return this;
    };

    Stream.prototype.readUInt32 = function() {
      var a0, a1, a2, a3, buffer;
      buffer = this.list.first.data;
      if (buffer.length > this.localOffset + 3) {
        a0 = buffer[this.localOffset + 0];
        a1 = buffer[this.localOffset + 1];
        a2 = buffer[this.localOffset + 2];
        a3 = buffer[this.localOffset + 3];
        this.advance(4);
      } else {
        a0 = this.readUInt8();
        a1 = this.readUInt8();
        a2 = this.readUInt8();
        a3 = this.readUInt8();
      }
      return ((a0 << 24) >>> 0) + (a1 << 16) + (a2 << 8) + a3;
    };

    Stream.prototype.peekUInt32 = function(offset) {
      var a0, a1, a2, a3, buffer;
      if (offset == null) offset = 0;
      buffer = this.list.first.data;
      if (buffer.length > this.localOffset + offset + 3) {
        a0 = buffer[this.localOffset + offset + 0];
        a1 = buffer[this.localOffset + offset + 1];
        a2 = buffer[this.localOffset + offset + 2];
        a3 = buffer[this.localOffset + offset + 3];
      } else {
        a0 = this.peekUInt8(offset + 0);
        a1 = this.peekUInt8(offset + 1);
        a2 = this.peekUInt8(offset + 2);
        a3 = this.peekUInt8(offset + 3);
      }
      return ((a0 << 24) >>> 0) + (a1 << 16) + (a2 << 8) + a3;
    };

    Stream.prototype.readInt32 = function() {
      var a0, a1, a2, a3, buffer;
      buffer = this.list.first.data;
      if (buffer.length > this.localOffset + offset + 3) {
        a0 = buffer[this.localOffset + 0];
        a1 = buffer[this.localOffset + 1];
        a2 = buffer[this.localOffset + 2];
        a3 = buffer[this.localOffset + 3];
        this.advance(4);
      } else {
        a0 = this.readUInt8();
        a1 = this.readUInt8();
        a2 = this.readUInt8();
        a3 = this.readUInt8();
      }
      return (a0 << 24) + (a1 << 16) + (a2 << 8) + a3;
    };

    Stream.prototype.peekInt32 = function(offset) {
      var a0, a1, a2, a3, buffer;
      if (offset == null) offset = 0;
      buffer = this.list.first.data;
      if (buffer.length > this.localOffset + offset + 3) {
        a0 = buffer[this.localOffset + offset + 0];
        a1 = buffer[this.localOffset + offset + 1];
        a2 = buffer[this.localOffset + offset + 2];
        a3 = buffer[this.localOffset + offset + 3];
      } else {
        a0 = this.peekUInt8(offset + 0);
        a1 = this.peekUInt8(offset + 1);
        a2 = this.peekUInt8(offset + 2);
        a3 = this.peekUInt8(offset + 3);
      }
      return (a0 << 24) + (a1 << 16) + (a2 << 8) + a3;
    };

    Stream.prototype.readUInt16 = function() {
      var a0, a1, buffer;
      buffer = this.list.first.data;
      if (buffer.length > this.localOffset + 1) {
        a0 = buffer[this.localOffset + 0];
        a1 = buffer[this.localOffset + 1];
        this.advance(2);
      } else {
        a0 = this.readUInt8();
        a1 = this.readUInt8();
      }
      return (a0 << 8) + a1;
    };

    Stream.prototype.peekUInt16 = function(offset) {
      var a0, a1, buffer;
      if (offset == null) offset = 0;
      buffer = this.list.first.data;
      if (buffer.length > this.localOffset + offset + 1) {
        a0 = buffer[this.localOffset + offset + 0];
        a1 = buffer[this.localOffset + offset + 1];
      } else {
        a0 = this.peekUInt8(offset + 0);
        a1 = this.peekUInt8(offset + 1);
      }
      return (a0 << 8) + a1;
    };

    Stream.prototype.readInt16 = function() {
      var a0, a1, buffer;
      buffer = this.list.first.data;
      if (buffer.length > this.localOffset + 1) {
        a0 = buffer[this.localOffset + 0];
        a1 = buffer[this.localOffset + 1];
      } else {
        a0 = this.readInt8();
        a1 = this.readUInt8();
      }
      return (a0 << 8) + a1;
    };

    Stream.prototype.peekInt16 = function(offset) {
      var a0, a1, buffer;
      if (offset == null) offset = 0;
      buffer = this.list.first.data;
      if (buffer.length > this.localOffset + offset + 1) {
        a0 = buffer[this.localOffset + offset + 0];
        a1 = buffer[this.localOffset + offset + 1];
      } else {
        a0 = this.peekInt8(offset + 0);
        a1 = this.peekUInt8(offset + 1);
      }
      return (a0 << 8) + a1;
    };

    Stream.prototype.readUInt8 = function() {
      var a0;
      a0 = this.list.first.data[this.localOffset];
      this.localOffset += 1;
      this.offset += 1;
      if (this.localOffset === this.list.first.length) {
        this.localOffset = 0;
        this.buffers.shift();
      }
      return a0;
    };

    Stream.prototype.peekUInt8 = function(offset) {
      var buffer, i;
      if (offset == null) offset = 0;
      offset = this.localOffset + offset;
      i = 0;
      buffer = this.list.buffers[i].data;
      while (!(buffer.length > offset)) {
        offset -= buffer.length;
        buffer = this.list.buffers[++i].data;
      }
      return buffer[offset];
    };

    Stream.prototype.peekSafeUInt8 = function(offset) {
      var buffer, i, list, _ref;
      if (offset == null) offset = 0;
      offset = this.localOffset + offset;
      list = this.list.buffers;
      for (i = 0, _ref = list.length; i < _ref; i += 1) {
        buffer = list[i];
        if (buffer.length > offset) {
          return buffer.data[offset];
        } else {
          offset -= buffer.length;
        }
      }
      return 0;
    };

    Stream.prototype.readInt8 = function() {
      var a0;
      a0 = (this.list.first.data[this.localOffset] << 24) >> 24;
      this.advance(1);
      return a0;
    };

    Stream.prototype.peekInt8 = function(offset) {
      var buffer, i;
      if (offset == null) offset = 0;
      offset = this.localOffset + offset;
      i = 0;
      buffer = this.list.buffers[i].data;
      while (!(buffer.length > offset)) {
        offset -= buffer.length;
        buffer = this.list.buffers[++i].data;
      }
      return (buffer[offset] << 24) >> 24;
    };

    Stream.prototype.readFloat64 = function() {
      ToFloat64[1] = this.readUInt32();
      ToFloat64[0] = this.readUInt32();
      return FromFloat64[0];
    };

    Stream.prototype.readFloat32 = function() {
      ToFloat32[0] = this.readUInt32();
      return FromFloat32[0];
    };

    Stream.prototype.readString = function(length) {
      var i, result;
      result = [];
      for (i = 0; 0 <= length ? i < length : i > length; 0 <= length ? i++ : i--) {
        result.push(String.fromCharCode(this.readUInt8()));
      }
      return result.join('');
    };

    Stream.prototype.peekString = function(length, offset) {
      var i, result;
      result = [];
      for (i = 0; 0 <= length ? i < length : i > length; 0 <= length ? i++ : i--) {
        result.push(String.fromCharCode(this.peekUInt8(offset + i)));
      }
      return result.join('');
    };

    Stream.prototype.readBuffer = function(length) {
      var i, result, to;
      result = Buffer.allocate(length);
      result.position = this.offset;
      to = result.data;
      for (i = 0; 0 <= length ? i < length : i > length; 0 <= length ? i++ : i--) {
        to[i] = this.readUInt8();
      }
      return result;
    };

    Stream.prototype.readSingleBuffer = function(length) {
      var result;
      result = this.list.first.slice(this.localOffset, length);
      result.position = this.offset;
      this.advance(result.length);
      return result;
    };

    return Stream;

  })();

  if (!window.Aurora) window.Aurora = {};

  window.Aurora.Stream = Stream;

  HTTPSource = (function() {

    function HTTPSource(name) {
      this.name = name;
      this.chunkSize = 1 << 20;
      this.outputs = {};
      this.reset();
    }

    HTTPSource.prototype.start = function() {
      var onAbort, onError, onLoad;
      var _this = this;
      this.status = "Started";
      if (!this.length) {
        if (this.inflight) {
          console.log("Should never be here, something is seriously wrong");
          debugger;
        }
        this.inflight = true;
        this.xhr = new XMLHttpRequest();
        onLoad = function(event) {
          _this.length = parseInt(_this.xhr.getResponseHeader("Content-Length"));
          _this.inflight = false;
          return _this.loop();
        };
        onError = function(event) {
          console.log("HTTP Error when requesting length: ", event);
          _this.inflight = false;
          _this.pause();
          _this.messagebus.send(_this, _this.name, "ERROR", "Source paused, failed to get length of file");
        };
        onAbort = function(event) {
          console.log("HTTP Aborted: Paused?");
          _this.inflight = false;
        };
        this.xhr.addEventListener("load", onLoad, false);
        this.xhr.addEventListener("error", onError, false);
        this.xhr.addEventListener("abort", onAbort, false);
        this.xhr.open("HEAD", this.url, true);
        this.xhr.send(null);
      }
      return this;
      if (this.inflight) {
        console.log("Should never get here, unless you're starting a stream with in-flight requests");
        debugger;
      }
      return this.loop();
    };

    HTTPSource.prototype.pause = function() {
      this.status = "Paused";
      if (this.inflight) {
        this.xhr.abort();
        this.inflight = false;
      }
      return this;
    };

    HTTPSource.prototype.reset = function() {
      this.status = "Paused";
      if (this.inflight) this.xhr.abort();
      this.offset = 0;
      this.inflight = false;
      return this;
    };

    HTTPSource.prototype.finished = function() {
      this.status = "Finished";
      return this;
    };

    HTTPSource.prototype.loop = function() {
      var onAbort, onError, onLoad;
      var _this = this;
      if (this.inflight) {
        console.log("Should never be here, unless a loop is failing");
        debugger;
      }
      if (this.offset === this.length) return this.finished();
      this.inflight = true;
      this.xhr = new XMLHttpRequest();
      onLoad = function(event) {
        var buffer;
        buffer = new Buffer(new Uint8Array(_this.xhr.response));
        _this.offset += buffer.length;
        if (_this.offset === _this.length) buffer.final = true;
        _this.outputs.data.send(buffer);
        _this.inflight = false;
        return _this.loop();
      };
      onError = function(event) {
        console.log("HTTP Error: ", event);
        _this.inflight = false;
        _this.pause();
        _this.messagebus.send(_this, _this.name, "ERROR", "Source paused, errror sending HTTP request");
      };
      onAbort = function(event) {
        console.log("HTTP Aborted: Paused?");
        _this.inflight = false;
      };
      this.xhr.addEventListener("load", onLoad, false);
      this.xhr.addEventListener("error", onError, false);
      this.xhr.addEventListener("abort", onAbort, false);
      this.xhr.open("GET", this.url, true);
      this.xhr.responseType = "arraybuffer";
      this.xhr.setRequestHeader("Range", "bytes=" + this.offset + "-" + (Math.min(this.offset + this.chunkSize, this.length)));
      this.xhr.send(null);
      return this;
    };

    return HTTPSource;

  })();

  if (!window.Aurora) window.Aurora = {};

  window.Aurora.HTTPSource = HTTPSource;

  FormatIDtoAuroraID = {
    'lpcm': 'Linear PCM',
    'alac': 'Apple Lossless Audio Codec (ALAC)'
  };

  CAFDemuxer = (function() {

    function CAFDemuxer(name) {
      var _this = this;
      this.name = name;
      this.inputs = {
        data: {
          send: function(buffer) {
            return _this.enqueueBuffer(buffer);
          },
          mode: "Passive"
        }
      };
      this.outputs = {
        cookie: null,
        data: null
      };
      this.list = new BufferList();
      this.stream = new Stream(this.list);
      this.metadata = null;
      this.bufferMetadata = null;
      this.headerCache = null;
      this.packetCache = null;
      this.magic = null;
      this.reset();
    }

    CAFDemuxer.prototype.enqueueBuffer = function(buffer) {
      var descCookie, descSizeA, descSizeB, format, magicCookie, size;
      this.list.push(buffer);
      if (!this.metadata && this.stream.available(64)) {
        magicCookie = this.stream.readString(4);
        if (magicCookie !== 'caff') {
          console.log("Invalid CAF, does not begin with 'caff'");
          debugger;
        }
        this.metadata = {
          caff: {
            version: this.stream.readUInt16(),
            flags: this.stream.readUInt16()
          }
        };
        descCookie = this.stream.readString(4);
        if (descCookie !== 'desc') {
          console.log("Invalid CAF, 'caff' is not followed by 'desc'");
          debugger;
        }
        descSizeA = this.stream.readUInt32();
        descSizeB = this.stream.readUInt32();
        if (!(descSizeA === 0 && descSizeB === 32)) {
          console.log("Invalid 'desc' size, should be 32");
          debugger;
        }
        this.metadata.desc = {
          samplingFrequency: this.stream.readFloat64(),
          formatID: this.stream.readString(4),
          formatFlags: this.stream.readUInt32(),
          bytesPerPacket: this.stream.readUInt32(),
          framesPerPacket: this.stream.readUInt32(),
          channelsPerFrame: this.stream.readUInt32(),
          bitsPerChannel: this.stream.readUInt32()
        };
        if (this.metadata.desc.formatID === 'lpcm') {
          format = {
            name: FormatIDtoAuroraID[this.metadata.desc.formatID],
            float: (this.metadata.desc.formatFlags & 0x01) === 0x01,
            littleEndian: (this.metadata.desc.formatFlags & 0x02) === 0x02
          };
        } else {
          format = {
            name: FormatIDtoAuroraID[this.metadata.desc.formatID]
          };
        }
        format.samplingFrequency = this.metadata.desc.samplingFrequency;
        format.channels = this.metadata.desc.channelsPerFrame;
        format.bitsPerChannel = this.metadata.desc.bitsPerChannel;
        if (this.metadata.desc.framesPerPacket) {
          format.framesPerPacket = this.metadata.desc.framesPerPacket;
        }
        if (this.metadata.desc.bytesPerPacket) {
          format.bytesPerPacket = this.metadata.desc.bytesPerPacket;
        }
        this.bufferMetadata = {
          format: format
        };
      }
      if (!this.metadata && buffer.final) {
        console.log("Not enough data in file for CAF header");
        debugger;
      }
      while ((this.headerCache && this.stream.available(1)) || this.stream.available(13)) {
        if (!this.headerCache) {
          this.headerCache = {
            type: this.stream.readString(4),
            oversize: this.stream.readUInt32() !== 0,
            size: this.stream.readUInt32()
          };
          if (this.headerCache.type === 'data') {
            this.stream.advance(4);
            this.headerCache.size -= 4;
          }
        }
        if (this.headerCache.oversize) {
          console.log("Holy Shit, an oversized file, not supported in JS");
          debugger;
        }
        size = this.headerCache.size;
        switch (this.headerCache.type) {
          case 'kuki':
            if (this.stream.available(this.headerCache.size)) {
              buffer = this.stream.readBuffer(this.headerCache.size);
              buffer.final = true;
              this.outputs.cookie.send(buffer);
              this.headerCache = null;
            } else {
              return;
            }
            break;
          case 'data':
            buffer = this.stream.readSingleBuffer(this.headerCache.size);
            buffer.metadata = this.bufferMetadata;
            this.headerCache.size -= buffer.length;
            if (this.headerCache.size <= 0) {
              this.headerCache = null;
              buffer.final = true;
            }
            this.outputs.data.send(buffer);
            break;
          default:
            if (this.stream.available(this.headerCache.size)) {
              this.stream.advance(this.headerCache.size);
              this.headerCache = null;
            } else {
              return;
            }
        }
      }
      if (buffer.final) this.finished();
    };

    CAFDemuxer.prototype.start = function() {
      this.status = "Started";
      return this;
    };

    CAFDemuxer.prototype.pause = function() {
      this.status = "Paused";
      return this;
    };

    CAFDemuxer.prototype.reset = function() {
      this.status = "Paused";
      return this;
    };

    CAFDemuxer.prototype.finished = function() {
      this.status = "Finished";
      return this;
    };

    return CAFDemuxer;

  })();

  if (!window.Aurora) window.Aurora = {};

  window.Aurora.CAFDemuxer = CAFDemuxer;

  LPCMDecoder = (function() {

    function LPCMDecoder(name) {
      var _this = this;
      this.name = name;
      this.inputs = {
        data: {
          send: function(buffer) {
            return _this.enqueueBuffer(buffer);
          },
          mode: "Passive"
        }
      };
      this.outputs = {
        audio: null
      };
      this.packetsDecoded = 0;
      this.reset();
    }

    LPCMDecoder.prototype.enqueueBuffer = function(buffer) {
      var array, bytes, format, i, input, output, result, samples, _ref, _ref2, _ref3, _ref4;
      format = buffer.metadata.format;
      array = buffer.data.buffer;
      if (format.name !== "Linear PCM") {
        console.log("Not decoding Linear PCM");
        debugger;
      }
      samples = buffer.length / (format.bitsPerChannel / 8) >> 0;
      bytes = samples * (format.bitsPerChannel / 8);
      output = new Float32Array(samples);
      if (format.float) {
        switch (format.bitsPerChannel) {
          case 64:
            input = new Float64Array(array, 0, samples);
            break;
          case 32:
            input = new Float32Array(array, 0, samples);
            break;
          default:
            console.log("Unsupported Float length " + format.bitsPerChannel + " bits");
            debugger;
        }
        for (i = 0, _ref = input.length; i < _ref; i += 1) {
          output[i] = input[i];
        }
      } else {
        if (format.littleEndian) {
          console.log("LE is unsupported right now, on TODO list");
          debugger;
        }
        switch (format.bitsPerChannel) {
          case 32:
            input = new Int32Array(array, 0, samples);
            for (i = 0, _ref2 = input.length; i < _ref2; i += 1) {
              output[i] = input[i] / 0x7FFFFFFF;
            }
            break;
          case 24:
            console.log("24 bit output is unsupported right now, on TODO list");
            debugger;
            break;
          case 16:
            input = new Int16Array(array, 0, samples);
            for (i = 0, _ref3 = input.length; i < _ref3; i += 1) {
              output[i] = input[i] / 0x7FFF;
            }
            break;
          case 8:
            input = new Uint8Array(array, 0, samples);
            for (i = 0, _ref4 = input.length; i < _ref4; i += 1) {
              output[i] = input[i] / 0xFF;
            }
            break;
          default:
            console.log("Unsupported Float length " + format.bitsPerChannel + " bits");
            debugger;
        }
      }
      output = new Uint8Array(output.buffer, 0, bytes);
      result = new Aurora.Buffer(output);
      result.duration = samples / format.samplingFrequency;
      result.timestamp = this.packetsDecoded++ * result.duration;
      result.metadata = {
        format: {
          name: "Linear PCM",
          float: true,
          samplingFrequency: format.samplingFrequency,
          channels: format.channels,
          bitsPerChannel: 32,
          framesPerPacket: format.framesPerPacket,
          bytesPerPacket: format.framesPerPacket * format.channels * 4
        }
      };
      result.final = buffer.final;
      return this.outputs.audio.send(result);
    };

    LPCMDecoder.prototype.start = function() {
      this.status = "Started";
      return this;
    };

    LPCMDecoder.prototype.pause = function() {
      this.status = "Paused";
      return this;
    };

    LPCMDecoder.prototype.reset = function() {
      this.status = "Paused";
      return this;
    };

    LPCMDecoder.prototype.finished = function() {
      this.status = "Finished";
      return this;
    };

    return LPCMDecoder;

  })();

  if (!window.Aurora) window.Aurora = {};

  window.Aurora.LPCMDecoder = LPCMDecoder;

  Queue = (function() {

    function Queue(name) {
      var _this = this;
      this.name = name;
      this.highwaterMark = 256;
      this.lowwaterMark = 64;
      this.finished = false;
      this.buffering = true;
      this.onHighwaterMark = null;
      this.onLowwaterMark = null;
      this.buffers = [];
      this.inputs = {
        contents: {
          send: function(buffer) {
            return _this.enqueueBuffer(buffer);
          },
          mode: "Passive"
        }
      };
      this.outputs = {
        contents: {
          receive: function() {
            return _this.dequeueBuffer();
          },
          mode: "Pull"
        }
      };
      this.reset();
    }

    Queue.prototype.enqueueBuffer = function(buffer) {
      this.buffers.push(buffer);
      if (this.buffering) {
        if (this.buffers.length >= this.highwaterMark || buffer.final) {
          if (this.onHighwaterMark) this.onHighwaterMark(this.buffers.length);
          this.buffering = false;
        }
      }
      return this;
    };

    Queue.prototype.dequeueBuffer = function() {
      var result;
      result = this.buffers.shift();
      if (!this.buffering) {
        if (this.buffers.length < this.lowwaterMark) {
          if (this.onLowwaterMark) this.onLowwaterMark(this.buffers.length);
          this.buffering = true;
        }
      }
      return result;
    };

    Queue.prototype.start = function() {
      this.status = "Started";
      return this;
    };

    Queue.prototype.pause = function() {
      this.status = "Paused";
      return this;
    };

    Queue.prototype.reset = function() {
      this.status = "Paused";
      return this;
    };

    Queue.prototype.finished = function() {
      this.status = "Finished";
      return this;
    };

    return Queue;

  })();

  if (!window.Aurora) window.Aurora = {};

  window.Aurora.Queue = Queue;

}).call(this);
