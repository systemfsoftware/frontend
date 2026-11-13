{
  description = "starter toolchain — the formatter, runtimes, systemfsoftware packages and dependency sandbox the check chain shells out to";

  # nix.systemfsoftware.com is the package registry for @systemfsoftware
  # packages: each producer pushes its tarballs there from its main branch, and
  # this flake substitutes them.
  nixConfig = {
    extra-substituters = "https://nix.systemfsoftware.com";
    extra-trusted-public-keys = "nix-cache-1:wXA8I4DayNW9q6enUyQA/P/nT38pGSTLt374t3gsn7M=";
    fallback = true;
  };

  inputs = {
    # One producer's nixpkgs: a producer input carries no `follows`, so this
    # consumer follows systemfsoftware and every producer evaluates the same
    # nixpkgs its registry entry was pushed from.
    nixpkgs.follows = "systemfsoftware/nixpkgs";
    comment-checker = {
      url = "github:systemfsoftware/comment-checker";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    # mkProducerTarballs and mkPnpmConsumerStore: the consumer route.
    pnpm-release-management = {
      url = "github:systemfsoftware/pnpm-release-management/ebebdfebf30205b508840ea55801d55283af7648";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.comment-checker.follows = "comment-checker";
      inputs.importPnpmLock.follows = "importPnpmLock";
    };
    # The producers, each pinned to its default branch's commit. Each one
    # gives packages.<system>.workspace-tarballs.
    systemfsoftware.url = "github:systemfsoftware/systemfsoftware/3ef6c21c36f19a539078b6817b495df3039cc163";
    stryker-js-effect.url = "github:systemfsoftware/stryker-js-effect/bc8680e836d3df9f80dc69770a9a91390447f8f1";
    systemfsoftware-xstate.url = "github:systemfsoftware/xstate/7d7ea103304f6aaa011b04335eec4724a6b8b967";
    are-the-types-wrong-effect.url = "github:systemfsoftware/are-the-types-wrong-effect/2650b6a0c6cd3b2abdb7f429a5a55dd5221588ca";
    # The pnpm store is hashless: each tarball's lockfile integrity is its fetch hash, so a lockfile change needs no hash edit.
    importPnpmLock = {
      url = "github:Scrumplex/importPnpmLock.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, comment-checker, pnpm-release-management, systemfsoftware, stryker-js-effect, systemfsoftware-xstate, are-the-types-wrong-effect, importPnpmLock }:
    let
      lib = nixpkgs.lib;
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forEachSystem = fn: lib.genAttrs systems (system: fn nixpkgs.legacyPackages.${system});

      # The producers whose packages this workspace installs. Their public
      # members share no name, so no precedence is needed.
      producers = { inherit systemfsoftware stryker-js-effect systemfsoftware-xstate are-the-types-wrong-effect; };

      # Every producer's tarball, under a name with no version, laid in `.deps`.
      producerTarballsOf = pkgs: pnpm-release-management.lib.mkProducerTarballs { inherit pkgs producers; };

      # The lockfile, the workspace doc and every manifest: all the consumer store reads.
      consumerSrc = lib.fileset.toSource {
        root = ./.;
        fileset = lib.fileset.unions [
          ./pnpm-lock.yaml
          ./pnpm-workspace.yaml
          (lib.fileset.fileFilter (file: file.name == "package.json") ./.)
        ];
      };

      workspaceOf = pkgs:
        removeAttrs (pnpm-release-management.lib.mkPnpmWorkspacePackages {
          inherit pkgs;
          src = self;
          pname = "starter";
          pnpm = pkgs.pnpm_12;
          files.".deps" = producerTarballsOf pkgs;
        }) [ "pnpm-store" "mitmCache" ];
    in
    {
      packages = forEachSystem (pkgs:
        let
          system = pkgs.stdenv.hostPlatform.system;
          dprint = pkgs.callPackage ./nix/dprint.nix { dprintConfig = ./dprint.json; };
          unwrapped = comment-checker.packages.${system}.comment-checker;
          sandboxed = pkgs.callPackage ./nix/comment-checker-sandbox.nix {
            comment-checker = unwrapped;
          };
          sandbox = pkgs.callPackage "${pnpm-release-management}/nix/sandbox/default.nix" { };
          workspace = workspaceOf pkgs;
          own = {
            inherit dprint sandbox;
            producer-tarballs = producerTarballsOf pkgs;
            pnpm-store = pnpm-release-management.lib.mkPnpmConsumerStore {
              inherit pkgs;
              src = consumerSrc;
              files.".deps" = producerTarballsOf pkgs;
            };
            sandbox-proofs = (pkgs.callPackage "${pnpm-release-management}/nix/sandbox/proofs.nix" {
              inherit pkgs sandbox;
              inherit (importPnpmLock.legacyPackages.${system}) iplConfigHook;
            }).sandbox-proofs;
            comment-checker = sandboxed;
            comment-checker-unwrapped = unwrapped;
            default = dprint;
          };
          clashes = builtins.attrNames (builtins.intersectAttrs own workspace);
        in
        assert clashes == [ ] || throw "flake.nix: workspace packages ${lib.concatStringsSep ", " clashes} collide with flake packages";
        workspace // own);

      devShells = forEachSystem (pkgs:
        let
          own = self.packages.${pkgs.stdenv.hostPlatform.system};
          playwrightBrowsers = pkgs.playwright-driver.browsers.override {
            withChromium = false;
            withFirefox = false;
            withWebkit = false;
            withFfmpeg = false;
          };
          # Without a font configuration the sandboxed browser lays text out
          # at zero height, so a visibility assertion on text fails.
          fontsConf = pkgs.makeFontsConf { fontDirectories = [ pkgs.dejavu_fonts ]; };
          # The launcher reads only store paths on PATH, the command and the
          # pnpm store, so a bare --pass-env cannot carry the browsers or the
          # font configuration in. A PATH entry whose closure reaches them
          # makes those store paths readable.
          playwrightBrowsersAnchor = pkgs.writeShellApplication {
            name = "playwright-browsers-anchor";
            runtimeInputs = [ playwrightBrowsers ];
            text = ": ${fontsConf}";
          };
        in {
        default = pkgs.mkShell {
          packages = [
            own.dprint
            own.comment-checker
            own.sandbox
            pnpm-release-management.packages.${pkgs.stdenv.hostPlatform.system}.release-tools
            pkgs.actionlint
            pkgs.nodejs_24
            pkgs.pnpm_12
            pkgs.deno
          ] ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [ playwrightBrowsersAnchor ];
          SANDBOX_PNPM_STORE = own.pnpm-store;
          shellHook = ''
            git config core.hooksPath .husky
            ${own.producer-tarballs.shellHook}
          '';
          env = pkgs.lib.optionalAttrs pkgs.stdenv.hostPlatform.isLinux {
            PLAYWRIGHT_BROWSERS_PATH = "${playwrightBrowsers}";
            FONTCONFIG_FILE = "${fontsConf}";
          };
        };
      });
    };
}
