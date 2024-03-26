import { Server, Socket } from "socket.io";
import kurentoClient, { type VideoInfo } from "kurento-client";
const stunServer = "stun:stun.l.google.com:19302";
const kurentoServer = "ws://192.168.1.130:8888/kurento";

const io = new Server({
  cors: {
    origin: "*",
  },
});

interface RoomInfo {
  videoURL: string;
  videoInfo: VideoInfo;
}

class RoomManager {
  private io: Server;
  private _info: RoomInfo | null = null;

  public playerEndpoint: kurentoClient.PlayerEndpoint | null = null;
  public pipeline: kurentoClient.MediaPipeline | null = null;

  constructor(io: Server) {
    this.io = io;
  }

  set info(info: RoomInfo | null) {
    this._info = info;
    this.io.emit("roomUpdated", info);
  }

  get info(): RoomInfo | null {
    return this._info;
  }

  // 初始化房间 初始化pipeline和player
  async init(videoURL: string) {
    this.pipeline = await kurento.create("MediaPipeline");
    this.playerEndpoint = await this.pipeline.create("PlayerEndpoint", {
      uri: videoURL,
    });

    await this.playerEndpoint.play();

    this.info = {
      videoURL: videoURL,
      videoInfo: await this.playerEndpoint.getVideoInfo(),
    };
  }

  async addSeat() {
    const webRTCEndpoint = await this.pipeline!.create("WebRtcEndpoint");
    await webRTCEndpoint.setStunServerAddress(stunServer);
    await room.playerEndpoint!.connect(webRTCEndpoint);

    return webRTCEndpoint;
  }

  async deleteSeat(webRTCEndpoint: kurentoClient.WebRtcEndpoint | null) {
    if (webRTCEndpoint && this.playerEndpoint) {
      this.playerEndpoint.disconnect(webRTCEndpoint);
      webRTCEndpoint.release();
    }
  }

  async play() {
    this.playerEndpoint!.play();
  }

  async pause() {
    this.playerEndpoint!.pause();
  }

  async doSeek(position: number) {
    this.playerEndpoint!.setPosition(position);
  }

  async close() {
    await this.playerEndpoint!.stop();
    await this.pipeline!.release();
    this.playerEndpoint = null;
    this.pipeline = null;
    room.info = null;
    this.io.emit("RoomClosed");
  }
}

const kurento = await kurentoClient(kurentoServer);
const room = new RoomManager(io);

function Session(socket: Socket, room: RoomManager) {
  console.log("new client connected:", socket.id);

  let webRTCEndpoint: kurentoClient.WebRtcEndpoint | null;

  return {
    createRoom: async (
      videoURL: string,
      response: (error: Error | null) => void,
    ) => {
      if (room.info) {
        response(new Error("room existed"));
      }

      await room.init(videoURL);
      response(null);
    },

    sendOffer: async (
      offer: string,
      response: (answer: string, error: Error | null) => void,
    ) => {
      if (!webRTCEndpoint) {
        response("", new Error("you haven't got your seat"));
        return;
      }

      const answer = await webRTCEndpoint.processOffer(offer);
      response(answer, null);
      webRTCEndpoint.gatherCandidates();
    },

    takeSeat: async (
      response: () => void,
    ) => {
      webRTCEndpoint = await room.addSeat();

      webRTCEndpoint.on("IceCandidateFound", (event) => {
        if (!event) {
          return;
        }
        socket.emit("addICECandidate", event.candidate);
      });
      response();
    },

    pushICECandidate: (iceCandidate: string) => {
      webRTCEndpoint!.addIceCandidate(iceCandidate);
    },

    // 媒体控制
    play: () => {
      room.play();
    },

    pause: () => {
      room.pause();
    },

    doSeek: (position: number) => {
      room.doSeek(position);
    },

    closeRoom: () => {
      room.close();
    },

    disconnect: async () => {
      room.deleteSeat(webRTCEndpoint);
      webRTCEndpoint = null;
    },
  };
}

io.on("connection", (socket) => {
  Object
    .entries(Session(socket, room))
    .forEach(([name, handler]) => socket.on(name, handler));

  socket.emit("roomUpdated", room.info);
});

io.listen(3000);
