import { Server, Socket } from "socket.io";
import kurentoClient from "kurento-client";
const stunServer = "stun:stun.l.google.com:19302";
const kurentoServer = "ws://192.168.1.130:8888/kurento";

const io = new Server({
  cors: {
    origin: "*",
  },
});
const kurento = await kurentoClient(kurentoServer);
let pipeline: kurentoClient.MediaPipeline;
let webRTCEndpoint: kurentoClient.WebRtcEndpoint;
let playerEndpoint: kurentoClient.PlayerEndpoint;

function Session(socket: Socket) {
  console.log(socket.id);

  return {
    createRoom: async (videoURL: string, response: () => void) => {
      pipeline = await kurento.create("MediaPipeline");
      webRTCEndpoint = await pipeline.create("WebRtcEndpoint");
      webRTCEndpoint.setStunServerAddress(stunServer);

      playerEndpoint = await pipeline.create("PlayerEndpoint", {
        uri: videoURL,
      });

      await playerEndpoint.connect(webRTCEndpoint);

      webRTCEndpoint.on("IceCandidateFound", (event) => {
        if (!event) {
          return;
        }
        socket.emit("addICECandidate", event.candidate);
      });

      response();
    },
    sendOffer: async (offer: string, response: (answer: string) => void) => {
      const answer = await webRTCEndpoint.processOffer(offer);
      response(answer);
      webRTCEndpoint.gatherCandidates();
    },
    pushICECandidate: (iceCandidate: string) => {
      // FIXME:iceCandidate到底是什么类型
      // event.candidate 是string类型
      webRTCEndpoint.addIceCandidate(iceCandidate);
    },
    play: () => {
      playerEndpoint.play();
    },
  };
}

io.on("connection", (socket) => {
  Object
    .entries(Session(socket))
    .forEach(([name, handler]) => socket.on(name, handler));
});

io.listen(3000);
